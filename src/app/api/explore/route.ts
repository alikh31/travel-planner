import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  searchText, 
  searchNearby, 
  geocodeAddress, 
  convertLegacyPlace 
} from '@/lib/google-maps-new'
import { saveChatGPTRequest, saveChatGPTResponse } from '@/lib/chatgpt-cache'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Cost optimization configuration
const GPT_SUGGESTIONS_COUNT = 10
const ENABLE_LIMITED_CATEGORIES = false
const LIMITED_CATEGORIES = ['restaurants', 'attractions', 'cafes', 'bars', 'shopping', 'nature']

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itineraryId, dayId } = await request.json()

    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 })
    }

    // Check if user has access to this itinerary
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id: itineraryId,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        accommodations: {
          orderBy: {
            checkIn: 'asc',
          },
        },
        days: {
          include: {
            activities: {
              include: {
                creator: true,
              },
              orderBy: {
                startTime: 'asc',
              },
            },
          },
          orderBy: {
            date: 'asc',
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found or access denied' }, { status: 404 })
    }

    // Get specific day if dayId is provided
    let targetDay = null
    if (dayId) {
      targetDay = itinerary.days.find(day => day.id === dayId)
      if (!targetDay) {
        return NextResponse.json({ error: 'Day not found' }, { status: 404 })
      }
    }

    // Generate GPT prompt based on itinerary data
    const activities = itinerary.days.flatMap(day => 
      day.activities.map(activity => ({
        title: activity.title,
        description: activity.description,
        location: activity.location,
        day: day.date
      }))
    )

    const accommodations = itinerary.accommodations.map(acc => ({
      name: acc.name,
      location: acc.location,
      checkIn: acc.checkIn,
      checkOut: acc.checkOut
    }))

    // Fetch user activity history (last 100 activities)
    const userActivities = await prisma.userActivity.findMany({
      where: {
        userId: session.user.id,
        itineraryId: itineraryId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    // Fetch user's wishlist for this itinerary
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
        itineraryId: itineraryId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Build context for GPT
    const tripDuration = Math.ceil(
      (new Date(itinerary.endDate).getTime() - new Date(itinerary.startDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    let prompt = `I'm planning a ${tripDuration}-day trip to ${itinerary.destination} from ${new Date(itinerary.startDate).toLocaleDateString()} to ${new Date(itinerary.endDate).toLocaleDateString()}.`

    if (itinerary.description) {
      prompt += ` Trip description: ${itinerary.description}`
    }

    if (activities.length > 0) {
      prompt += ` My planned activities include: ${activities.map(a => a.title).join(', ')}.`
    }

    if (accommodations.length > 0) {
      prompt += ` I'm staying at: ${accommodations.map(a => `${a.name} in ${a.location}`).join(', ')}.`
    }

    if (targetDay) {
      const dayActivities = targetDay.activities
      prompt += ` I'm specifically looking for recommendations for ${new Date(targetDay.date).toLocaleDateString()}.`
      if (dayActivities.length > 0) {
        prompt += ` On this day I have planned: ${dayActivities.map(a => a.title).join(', ')}.`
      }
    }

    // Add wishlist information
    if (wishlistItems.length > 0) {
      prompt += `\n\nMy Saved Places (Wishlist):\nI have already saved these places to my wishlist: ${wishlistItems.map(item => item.placeName).join(', ')}. These represent places I'm interested in or plan to visit, so consider similar types of places or complementary experiences.`
    }

    // Add user activity analysis
    if (userActivities.length > 0) {
      // Analyze user behavior patterns
      const totalActivities = userActivities.length
      const avgViewTime = userActivities
        .filter(a => a.totalViewTime)
        .reduce((sum, a) => sum + (a.totalViewTime || 0), 0) / 
        userActivities.filter(a => a.totalViewTime).length

      const avgImageSlides = userActivities.reduce((sum, a) => sum + a.imageSlides, 0) / totalActivities
      const wishlistConversionRate = userActivities.filter(a => a.addedToWishlist).length / totalActivities
      const mostViewedPlaces = userActivities
        .filter(a => a.totalViewTime && a.totalViewTime > (avgViewTime || 0))
        .slice(0, 10)
        .map(a => a.placeName)

      // Get latest 50 activities with detailed analysis
      const latest50Activities = userActivities.slice(0, 50)
      const gptSuggestedPlaces = latest50Activities.filter(a => a.isGptSuggestion)
      const nearbySearchPlaces = latest50Activities.filter(a => a.searchSource === 'nearby_search')
      const textSearchPlaces = latest50Activities.filter(a => a.searchSource === 'text_search')
      
      // Analyze engagement by source
      const gptEngagement = gptSuggestedPlaces.length > 0 ? {
        avgViewTime: gptSuggestedPlaces.filter(a => a.totalViewTime).reduce((sum, a) => sum + (a.totalViewTime || 0), 0) / gptSuggestedPlaces.filter(a => a.totalViewTime).length,
        avgImageSlides: gptSuggestedPlaces.reduce((sum, a) => sum + a.imageSlides, 0) / gptSuggestedPlaces.length,
        wishlistRate: gptSuggestedPlaces.filter(a => a.addedToWishlist).length / gptSuggestedPlaces.length
      } : null

      // Analyze engagement by category
      const categoryEngagement = latest50Activities.reduce((acc, activity) => {
        if (activity.gptCategory) {
          if (!acc[activity.gptCategory]) {
            acc[activity.gptCategory] = { count: 0, totalViewTime: 0, wishlistAdds: 0, imageSlides: 0 }
          }
          acc[activity.gptCategory].count++
          acc[activity.gptCategory].totalViewTime += activity.totalViewTime || 0
          acc[activity.gptCategory].wishlistAdds += activity.addedToWishlist ? 1 : 0
          acc[activity.gptCategory].imageSlides += activity.imageSlides
        }
        return acc
      }, {} as Record<string, { count: number; totalViewTime: number; wishlistAdds: number; imageSlides: number }>)

      // Find preferred categories based on engagement
      const preferredCategories = Object.entries(categoryEngagement)
        .map(([category, stats]) => ({
          category,
          avgViewTime: stats.totalViewTime / stats.count,
          wishlistRate: stats.wishlistAdds / stats.count,
          avgImageSlides: stats.imageSlides / stats.count,
          count: stats.count
        }))
        .filter(cat => cat.count >= 3) // Only include categories with at least 3 interactions
        .sort((a, b) => (b.avgViewTime + b.wishlistRate * 1000 + b.avgImageSlides * 100) - (a.avgViewTime + a.wishlistRate * 1000 + a.avgImageSlides * 100))
        .slice(0, 5)

      // Identify browsing patterns
      const recentWishlistAdds = latest50Activities.filter(a => a.addedToWishlist).slice(0, 10)
      const quickDismissals = latest50Activities.filter(a => a.totalViewTime && a.totalViewTime < 3000 && a.imageSlides < 2).slice(0, 10)
      const deepEngagements = latest50Activities.filter(a => a.totalViewTime && a.totalViewTime > 15000).slice(0, 10)

      prompt += `\n\nMy Browsing Behavior Analysis:
- I have viewed ${totalActivities} places while exploring
- Average time spent viewing places: ${avgViewTime ? Math.round(avgViewTime / 1000) : 'N/A'} seconds
- Average images viewed per place: ${Math.round(avgImageSlides)}
- Wishlist conversion rate: ${Math.round(wishlistConversionRate * 100)}%`

      if (mostViewedPlaces.length > 0) {
        prompt += `
- Places I spent the most time viewing: ${mostViewedPlaces.join(', ')}`
      }

      // Add detailed analysis of latest 50 activities
      prompt += `\n\nDetailed Analysis of My Latest 50 Activities:`
      
      if (gptEngagement && gptSuggestedPlaces.length > 0) {
        prompt += `
- GPT Suggested Places Performance (${gptSuggestedPlaces.length} places):
  * Average view time: ${Math.round(gptEngagement.avgViewTime / 1000)} seconds
  * Average images viewed: ${Math.round(gptEngagement.avgImageSlides)}
  * Wishlist conversion: ${Math.round(gptEngagement.wishlistRate * 100)}%`
      }

      if (preferredCategories.length > 0) {
        prompt += `
- My Most Engaged Categories:
${preferredCategories.map(cat => 
  `  * ${cat.category}: ${cat.count} views, ${Math.round(cat.avgViewTime / 1000)}s avg, ${Math.round(cat.wishlistRate * 100)}% wishlist rate`
).join('\n')}`
      }

      if (recentWishlistAdds.length > 0) {
        prompt += `
- Recent Places I Added to Wishlist: ${recentWishlistAdds.map(a => a.placeName).join(', ')}`
      }

      if (quickDismissals.length > 0) {
        prompt += `
- Places I Quickly Dismissed (low engagement): ${quickDismissals.map(a => a.placeName).slice(0, 5).join(', ')}`
      }

      if (deepEngagements.length > 0) {
        prompt += `
- Places I Spent Most Time Exploring: ${deepEngagements.map(a => `${a.placeName} (${Math.round((a.totalViewTime || 0) / 1000)}s)`).slice(0, 5).join(', ')}`
      }

      // Add source preference analysis
      const sourceStats = {
        gpt: gptSuggestedPlaces.length,
        nearby: nearbySearchPlaces.length,
        text: textSearchPlaces.length
      }
      
      if (sourceStats.gpt > 0 || sourceStats.nearby > 0 || sourceStats.text > 0) {
        prompt += `
- Place Discovery Preferences: ${sourceStats.gpt > sourceStats.nearby + sourceStats.text ? 'I prefer AI-curated suggestions' : sourceStats.nearby > sourceStats.gpt + sourceStats.text ? 'I prefer exploring nearby places' : 'I engage with various discovery methods'}`
      }

      prompt += `\n\nBased on this detailed behavior analysis, suggest places that specifically align with my demonstrated engagement patterns and category preferences.`
    }

    prompt += `

Please suggest exactly ${GPT_SUGGESTIONS_COUNT} specific places to visit in ${itinerary.destination} including:
- Restaurants and cafes with local cuisine
- Bars and nightlife venues  
- Tourist attractions and museums
- Shopping areas and markets
- Parks and nature spots
- Cultural and historical sites
- Entertainment venues and experiences

IMPORTANT PERSONALIZATION INSTRUCTIONS:
${wishlistItems.length > 0 ? `- Consider that I've shown interest in: ${wishlistItems.map(item => item.placeName).join(', ')}. Suggest similar places or complementary experiences.` : ''}
${userActivities.length > 0 ? `- Based on my browsing patterns, I tend to ${userActivities.filter(a => a.addedToWishlist).length / userActivities.length > 0.3 ? 'save many places I find interesting' : 'be selective about places I save'}. ${Math.round(userActivities.reduce((sum, a) => sum + a.imageSlides, 0) / userActivities.length) > 2 ? 'I like to explore multiple images of places.' : 'I tend to look at fewer images per place.'}` : ''}
- Avoid suggesting places I've already added to my wishlist
- Focus on highly-rated, popular places that align with my demonstrated interests
- Include both must-see landmarks and hidden gems
- Prioritize places that complement my planned activities and accommodation locations

Return only the place names, one per line, without numbers or bullet points.`

    // Get GPT suggestions
    let gptSuggestions: string[] = []
    let requestTimestamp: string = ''
    
    try {
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a knowledgeable travel assistant specialized in personalized recommendations. Use the user\'s browsing behavior, wishlist preferences, and planned activities to suggest places they\'re most likely to enjoy. Focus on quality over quantity and consider their demonstrated interests and engagement patterns.'
        },
        {
          role: 'user' as const,
          content: prompt
        }
      ]

      // Cache the request
      requestTimestamp = await saveChatGPTRequest(
        itineraryId, 
        messages, 
        'gpt-4o-mini',
        { maxTokens: 800, temperature: 0.7 }
      )

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      })

      // Cache the response
      await saveChatGPTResponse(itineraryId, requestTimestamp, completion)

      const response = completion.choices[0]?.message?.content || ''
      gptSuggestions = response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)

    } catch (gptError) {
      console.error('GPT API error:', gptError)
      
      // Cache the error response
      if (requestTimestamp) {
        await saveChatGPTResponse(itineraryId, requestTimestamp, null, `${gptError}`)
      }
      
      // Continue without GPT suggestions if API fails
    }

    // Get destination coordinates
    const destinationCoords = await geocodeAddress(itinerary.destination)
    
    if (!destinationCoords) {
      console.error('Could not geocode destination:', itinerary.destination)
      return NextResponse.json({ 
        suggestions: gptSuggestions,
        places: {},
        error: 'Could not determine destination location' 
      }, { status: 200 })
    }

    const allPlaces: any[] = []
    const placeMetadata = new Map<string, { isGptSuggestion: boolean, gptCategory?: string, searchSource: string }>()
    
    // Search for GPT suggestions using Text Search
    for (let i = 0; i < gptSuggestions.length; i++) {
      const suggestion = gptSuggestions[i]
      const places = await searchText(`${suggestion} ${itinerary.destination}`, {
        maxResults: 1,
        locationBias: { ...destinationCoords, radius: 50000 },
        usePreferred: false // Use basic fields for suggestions
      })
      
      if (places.length > 0) {
        const convertedPlace = convertLegacyPlace(places[0])
        allPlaces.push(convertedPlace)
        
        // Determine category based on suggestion context or place types
        let category = 'general'
        if (convertedPlace.types) {
          if (convertedPlace.types.some((t: string) => ['restaurant', 'food'].includes(t))) {
            category = 'restaurant'
          } else if (convertedPlace.types.some((t: string) => ['cafe', 'coffee_shop'].includes(t))) {
            category = 'cafe'
          } else if (convertedPlace.types.some((t: string) => ['bar', 'night_club'].includes(t))) {
            category = 'bar'
          } else if (convertedPlace.types.some((t: string) => ['tourist_attraction', 'museum'].includes(t))) {
            category = 'attraction'
          } else if (convertedPlace.types.some((t: string) => ['shopping_mall', 'store'].includes(t))) {
            category = 'shopping'
          } else if (convertedPlace.types.some((t: string) => ['park', 'natural_feature'].includes(t))) {
            category = 'nature'
          }
        }
        
        placeMetadata.set(convertedPlace.place_id, {
          isGptSuggestion: true,
          gptCategory: category,
          searchSource: 'gpt'
        })
      }
    }
    
    // Category-based searches using Nearby Search (more cost-effective)
    const nearbySearchTypes = [
      'restaurant',
      'cafe', 
      'bar',
      'park',
      'museum',
      'shopping_mall'
    ]
    
    for (const type of nearbySearchTypes) {
      const places = await searchNearby(destinationCoords, {
        radius: 15000,
        types: [type],
        maxResults: 12,
        usePreferred: false // Use basic fields for initial search
      })
      
      const convertedPlaces = places.map(place => convertLegacyPlace(place))
      convertedPlaces.forEach(place => {
        if (!placeMetadata.has(place.place_id)) {
          placeMetadata.set(place.place_id, {
            isGptSuggestion: false,
            searchSource: 'nearby_search'
          })
        }
      })
      allPlaces.push(...convertedPlaces)
    }
    
    // Additional text searches for specific categories
    const textSearchQueries = [
      `tourist attractions in ${itinerary.destination}`,
      `nightlife in ${itinerary.destination}`
    ]
    
    for (const query of textSearchQueries) {
      const places = await searchText(query, {
        maxResults: 8,
        locationBias: { ...destinationCoords, radius: 50000 },
        usePreferred: false
      })
      
      const convertedPlaces = places.map(place => convertLegacyPlace(place))
      convertedPlaces.forEach(place => {
        if (!placeMetadata.has(place.place_id)) {
          placeMetadata.set(place.place_id, {
            isGptSuggestion: false,
            searchSource: 'text_search'
          })
        }
      })
      allPlaces.push(...convertedPlaces)
    }
    
    // Remove duplicates based on place_id
    const uniquePlaces = allPlaces.reduce((acc: any[], place) => {
      if (!acc.find((p: any) => p.place_id === place.place_id)) {
        acc.push(place)
      }
      return acc
    }, [])

    // Categorize places
    const allCategoryMappings = {
      restaurants: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['restaurant', 'food', 'meal_takeaway'].includes(type))
      ),
      cafes: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['cafe', 'coffee_shop', 'bakery'].includes(type))
      ),
      bars: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['bar', 'night_club', 'pub'].includes(type))
      ),
      attractions: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['tourist_attraction', 'museum', 'amusement_park', 'zoo', 'aquarium'].includes(type))
      ),
      arts: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['art_gallery', 'library', 'theater'].includes(type))
      ),
      entertainment: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['movie_theater', 'bowling_alley', 'casino'].includes(type))
      ),
      wellness: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['spa', 'gym', 'beauty_salon'].includes(type))
      ),
      shopping: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['shopping_mall', 'store', 'market', 'clothing_store'].includes(type))
      ),
      nature: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['park', 'natural_feature', 'hiking_area', 'campground'].includes(type))
      ),
      culture: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['church', 'hindu_temple', 'mosque', 'synagogue', 'city_hall', 'monument'].includes(type))
      ),
    }
    
    // Filter categories based on configuration
    const categorizedPlaces: any = {}
    if (ENABLE_LIMITED_CATEGORIES) {
      LIMITED_CATEGORIES.forEach(categoryId => {
        if (allCategoryMappings[categoryId as keyof typeof allCategoryMappings]) {
          categorizedPlaces[categoryId] = allCategoryMappings[categoryId as keyof typeof allCategoryMappings]
        }
      })
    } else {
      Object.assign(categorizedPlaces, allCategoryMappings)
    }

    // Convert metadata Map to plain object for response
    const metadataObject: { [key: string]: any } = {}
    placeMetadata.forEach((value, key) => {
      metadataObject[key] = value
    })

    return NextResponse.json({
      suggestions: gptSuggestions,
      places: categorizedPlaces,
      placeMetadata: metadataObject,
      itinerary: {
        id: itinerary.id,
        title: itinerary.title,
        destination: itinerary.destination,
        startDate: itinerary.startDate,
        endDate: itinerary.endDate
      },
      day: targetDay ? {
        id: targetDay.id,
        date: targetDay.date,
        activities: targetDay.activities
      } : null
    })

  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}