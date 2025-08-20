import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { 
  searchText, 
  geocodeAddress, 
  convertLegacyPlace,
  getPlaceDetails
} from '@/lib/google-maps-new'
import { getDayDate } from '@/lib/date-utils'
import { saveChatGPTConversation } from '@/lib/chatgpt-cache'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Cost optimization configuration
const GPT_SUGGESTIONS_COUNT = 15

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { itineraryId, dayId, excludeExisting, currentSuggestions } = await request.json()

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
            dayIndex: 'asc',
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
        day: getDayDate(itinerary.startDate, day.dayIndex || 0).toISOString()
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

    // Get existing GPT suggestions if we need to exclude them
    let existingGptSuggestions: string[] = []
    if (excludeExisting) {
      const existingActivities = await prisma.userActivity.findMany({
        where: {
          userId: session.user.id,
          itineraryId: itineraryId,
          isGptSuggestion: true
        },
        select: {
          placeName: true
        },
        distinct: ['placeName']
      })
      existingGptSuggestions = existingActivities.map(activity => activity.placeName)
    }

    // Combine database suggestions with current session suggestions to avoid all duplicates
    const allExistingSuggestions = new Set([
      ...existingGptSuggestions,
      ...(currentSuggestions || [])
    ])
    const existingSuggestionsList = Array.from(allExistingSuggestions)

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
      const targetDayDate = getDayDate(itinerary.startDate, targetDay.dayIndex || 0)
      prompt += ` I'm specifically looking for recommendations for ${targetDayDate.toLocaleDateString()}.`
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

      // Get latest 200 activities with detailed analysis
      const latest50Activities = userActivities.slice(0, 200)
      const gptSuggestedPlaces = latest50Activities.filter(a => a.isGptSuggestion)
      
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


      prompt += `\n\nMy Browsing Behavior Analysis:
- I have viewed ${totalActivities} places while exploring
- Average time spent viewing places: ${avgViewTime ? Math.round(avgViewTime / 1000) : 'N/A'} seconds
- Average images viewed per place: ${Math.round(avgImageSlides)}
- Wishlist conversion rate: ${Math.round(wishlistConversionRate * 100)}%`

      if (mostViewedPlaces.length > 0) {
        prompt += `
- Places I spent the most time viewing: ${mostViewedPlaces.join(', ')}`
      }

      // Add raw detailed analysis of latest 50 activities
      prompt += `\n\nDetailed Analysis of My Latest 50 Activities:`
      
      // Show individual activities with raw data
      prompt += `\nRecent Activity Log (most recent first):`
      latest50Activities.forEach((activity, index) => {
        const viewTimeSeconds = activity.totalViewTime ? Math.round(activity.totalViewTime / 1000) : 0
        const wishlistStatus = activity.addedToWishlist ? '✓ WISHLISTED' : ''
        const sourceType = activity.isGptSuggestion ? '[GPT]' : 
                          activity.searchSource === 'nearby_search' ? '[NEARBY]' :
                          activity.searchSource === 'text_search' ? '[TEXT]' : '[OTHER]'
        const categoryInfo = activity.gptCategory ? ` (${activity.gptCategory})` : ''
        
        prompt += `\n${index + 1}. ${activity.placeName}${categoryInfo} ${sourceType}
   - View time: ${viewTimeSeconds}s | Images viewed: ${activity.imageSlides} | ${wishlistStatus || 'Not wishlisted'}`
        
        if (activity.timeToWishlist && activity.addedToWishlist) {
          prompt += ` | Wishlisted after: ${Math.round(activity.timeToWishlist / 1000)}s`
        }
      })

      // Add aggregated insights after the raw data
      if (gptEngagement && gptSuggestedPlaces.length > 0) {
        prompt += `\n\nGPT Suggestions Summary (${gptSuggestedPlaces.length} places):
- Average view time: ${Math.round(gptEngagement.avgViewTime / 1000)}s
- Average images viewed: ${Math.round(gptEngagement.avgImageSlides)}
- Wishlist conversion: ${Math.round(gptEngagement.wishlistRate * 100)}%`
      }

      if (preferredCategories.length > 0) {
        prompt += `\n\nMost Engaged Categories:
${preferredCategories.map(cat => 
  `- ${cat.category}: ${cat.count} views, ${Math.round(cat.avgViewTime / 1000)}s avg, ${Math.round(cat.wishlistRate * 100)}% wishlist rate`
).join('\n')}`
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
${existingSuggestionsList.length > 0 ? `- CRITICAL: Do NOT suggest these places I've already been shown: ${existingSuggestionsList.join(', ')}. I need completely NEW suggestions.` : ''}
- Focus on highly-rated, popular places that align with my demonstrated interests
- Include both must-see landmarks and hidden gems
- Prioritize places that complement my planned activities and accommodation locations

Return exactly ${GPT_SUGGESTIONS_COUNT} suggestions in this EXACT format (no extra text, no explanations):
PLACE_NAME|CATEGORY|TIMEFRAME|DURATION

STRICT REQUIREMENTS:
- CATEGORY must be one of: restaurant, cafe, bar, attraction, museum, shopping, nature, culture, entertainment, nightlife
- TIMEFRAME must be one of: morning, afternoon, evening, night, anytime
- DURATION must be a number in minutes (30-300 range)
- Each line must have exactly 4 parts separated by |
- No additional text, explanations, or numbering

Example format:
Blue Bottle Coffee|cafe|morning|45
Golden Gate Bridge|attraction|anytime|120
Mission Dolores Park|nature|afternoon|90

CRITICAL: Follow this format exactly. Do not deviate.`

    // Get GPT suggestions with categories, timeframes, and durations
    let gptSuggestions: Array<{ name: string; category: string; timeframe: string; duration: number }> = []
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

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      })

      const response = completion.choices[0]?.message?.content || ''

      // Cache the conversation (prompt and response)
      await saveChatGPTConversation(itineraryId, prompt, response)
      
      // Parse the structured response (PLACE_NAME|CATEGORY|TIMEFRAME|DURATION format)
      const suggestions = response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.trim())
        .filter(line => line.includes('|'))
        .map(line => {
          const parts = line.split('|').map(part => part.trim())
          if (parts.length >= 4) {
            const [name, category, timeframe, durationStr] = parts
            const duration = parseInt(durationStr) || 60 // Default to 60 minutes if parsing fails
            
            // Validate timeframe
            const validTimeframes = ['morning', 'afternoon', 'evening', 'night', 'anytime']
            const validatedTimeframe = validTimeframes.includes(timeframe.toLowerCase()) ? timeframe.toLowerCase() : 'anytime'
            
            // Validate duration (30-300 minutes)
            const validatedDuration = duration >= 30 && duration <= 300 ? duration : 60
            
            return { name, category, timeframe: validatedTimeframe, duration: validatedDuration }
          } else if (parts.length >= 2) {
            // Fallback for old format
            const [name, category] = parts
            return { name, category, timeframe: 'anytime', duration: 60 }
          }
          return null
        })
        .filter((suggestion): suggestion is { name: string; category: string; timeframe: string; duration: number } => 
          suggestion !== null && Boolean(suggestion.name) && Boolean(suggestion.category))
        .slice(0, GPT_SUGGESTIONS_COUNT) // Ensure we don't exceed the configured max
      

      // Randomize the order of suggestions using Fisher-Yates shuffle
      for (let i = suggestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]]
      }

      gptSuggestions = suggestions

    } catch (gptError) {
      console.error('GPT API error:', gptError)
      
      // Cache the error
      await saveChatGPTConversation(itineraryId, prompt, '', `${gptError}`)
      
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
    const placeMetadata = new Map<string, { isGptSuggestion: boolean, gptCategory?: string, gptTimeframe?: string, gptDuration?: number, searchSource: string }>()
    
    // Search for GPT suggestions using Text Search - this is now our only source
    for (let i = 0; i < gptSuggestions.length; i++) {
      const suggestion = gptSuggestions[i]
      const places = await searchText(`${suggestion.name} ${itinerary.destination}`, {
        maxResults: 1,
        locationBias: { ...destinationCoords, radius: 50000 },
        usePreferred: false // Use basic fields for suggestions
      })
      
      if (places.length > 0) {
        // Fetch place details to get the formatted address
        const placeDetails = await getPlaceDetails(places[0].id, { usePreferred: false })
        const placeWithAddress = placeDetails || places[0]
        
        const convertedPlace = convertLegacyPlace(placeWithAddress)
        allPlaces.push(convertedPlace)
        
        // Use the ChatGPT-determined category, timeframe, and duration
        const metadata = {
          isGptSuggestion: true,
          gptCategory: suggestion.category,
          gptTimeframe: suggestion.timeframe,
          gptDuration: suggestion.duration,
          searchSource: 'gpt'
        }
        placeMetadata.set(convertedPlace.place_id, metadata)
      }
    }
    
    // Remove duplicates based on place_id (though unlikely with GPT suggestions only)
    const uniquePlaces = allPlaces.reduce((acc: any[], place) => {
      if (!acc.find((p: any) => p.place_id === place.place_id)) {
        acc.push(place)
      }
      return acc
    }, [])

    // Categorize places based on ChatGPT categories instead of Google Place types
    const categorizedPlaces: any = {}
    
    // Group places by their ChatGPT-determined categories
    uniquePlaces.forEach((place: any) => {
      const metadata = placeMetadata.get(place.place_id)
      const category = metadata?.gptCategory || 'general'
      
      if (!categorizedPlaces[category]) {
        categorizedPlaces[category] = []
      }
      categorizedPlaces[category].push(place)
    })

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
        date: getDayDate(itinerary.startDate, targetDay.dayIndex || 0).toISOString(),
        activities: targetDay.activities
      } : null
    })

  } catch (error) {
    console.error('Error in explore API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}