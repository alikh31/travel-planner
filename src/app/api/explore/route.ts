import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

    prompt += `

Please suggest 15-20 specific places to visit in ${itinerary.destination} including:
- Restaurants and cafes with local cuisine
- Bars and nightlife venues  
- Tourist attractions and museums
- Shopping areas and markets
- Parks and nature spots
- Cultural and historical sites
- Entertainment venues and experiences
- Local markets and food halls
- Viewpoints and observation decks
- Historic neighborhoods and districts

Focus on highly-rated, popular places that tourists love. Include both must-see landmarks and hidden gems. Return only the place names, one per line, without numbers or bullet points.`

    // Get GPT suggestions
    let gptSuggestions: string[] = []
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a knowledgeable travel assistant. Provide specific, popular place recommendations for the given destination.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      })

      const response = completion.choices[0]?.message?.content || ''
      gptSuggestions = response
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
        .filter(line => line.length > 0)

    } catch (gptError) {
      console.error('GPT API error:', gptError)
      // Continue without GPT suggestions if API fails
    }

    // Search for places using Google Places API
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!googleApiKey) {
      console.error('Google Maps API key not found')
      return NextResponse.json({ 
        suggestions: gptSuggestions,
        places: [],
        error: 'Google Maps API key not configured' 
      }, { status: 200 })
    }

    console.log('Starting Google Places search with', gptSuggestions.length, 'suggestions for', itinerary.destination)

    const allPlaces: any[] = []
    const placeTypes = [
      'restaurant',
      'cafe', 
      'bar',
      'tourist_attraction',
      'museum',
      'shopping_mall',
      'store',
      'park',
      'church',
      'amusement_park',
      'zoo',
      'aquarium',
      'art_gallery',
      'night_club',
      'movie_theater',
      'bowling_alley',
      'spa',
      'casino'
    ]

    // Additional targeted searches for popular categories
    const additionalSearches = [
      `top restaurants in ${itinerary.destination}`,
      `best cafes in ${itinerary.destination}`,
      `popular attractions in ${itinerary.destination}`,
      `shopping districts in ${itinerary.destination}`,
      `nightlife in ${itinerary.destination}`,
      `parks and gardens in ${itinerary.destination}`,
      `museums in ${itinerary.destination}`,
      `local markets in ${itinerary.destination}`
    ]

    // Helper function to process places search with concurrency limit
    const searchPlacesWithConcurrency = async (searchRequests: Array<{url: string, type: string, maxResults: number}>, maxConcurrency = 10) => {
      const results: any[] = []
      
      // Process requests in batches of maxConcurrency
      for (let i = 0; i < searchRequests.length; i += maxConcurrency) {
        const batch = searchRequests.slice(i, i + maxConcurrency)
        console.log(`Processing batch ${Math.floor(i / maxConcurrency) + 1}/${Math.ceil(searchRequests.length / maxConcurrency)} with ${batch.length} requests`)
        
        const batchPromises = batch.map(async (request) => {
          try {
            console.log(`Fetching: ${request.type}`)
            const response = await fetch(request.url)
            const data = await response.json()
            
            console.log(`API response for "${request.type}":`, data.status, 'Results:', data.results?.length || 0)
            
            if (data.status === 'REQUEST_DENIED') {
              console.error(`Google Places API request denied for "${request.type}":`, data.error_message)
              return []
            }
            
            if (data.results && data.results.length > 0) {
              const places = data.results.slice(0, request.maxResults).map((place: any) => ({
                place_id: place.place_id,
                name: place.name,
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                price_level: place.price_level,
                vicinity: place.vicinity || place.formatted_address,
                opening_hours: place.opening_hours,
                photos: place.photos,
                geometry: place.geometry,
                types: place.types,
                source: request.type.includes('suggestion') ? 'gpt_suggestion' : 
                       request.type.includes('category') ? 'category_search' : 'additional_search'
              }))
              
              console.log(`Found ${places.length} places for "${request.type}"`)
              return places
            }
            
            return []
          } catch (error) {
            console.error(`Error in search for "${request.type}":`, error)
            return []
          }
        })
        
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults.flat())
        
        // Small delay between batches to be respectful to the API
        if (i + maxConcurrency < searchRequests.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
      
      return results
    }

    // Prepare all search requests
    const allSearchRequests = [
      // GPT suggestions searches
      ...gptSuggestions.map(suggestion => ({
        url: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(suggestion + ' ' + itinerary.destination)}&key=${googleApiKey}`,
        type: `suggestion: ${suggestion}`,
        maxResults: 1
      })),
      
      // Category searches
      ...placeTypes.map(type => ({
        url: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(itinerary.destination)}&type=${type}&key=${googleApiKey}`,
        type: `category: ${type}`,
        maxResults: 5
      })),
      
      // Additional targeted searches
      ...additionalSearches.map(searchQuery => ({
        url: `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}`,
        type: `additional: ${searchQuery}`,
        maxResults: 3
      }))
    ]

    console.log(`Starting parallel search for ${allSearchRequests.length} requests with max concurrency of 10`)
    const startTime = Date.now()
    
    // Execute all searches with concurrency control
    allPlaces.push(...await searchPlacesWithConcurrency(allSearchRequests, 10))
    
    const endTime = Date.now()
    console.log(`Completed all searches in ${endTime - startTime}ms`)

    console.log('Total places found before deduplication:', allPlaces.length)
    
    // Remove duplicates based on place_id
    const uniquePlaces = allPlaces.reduce((acc: any[], place) => {
      if (!acc.find((p: any) => p.place_id === place.place_id)) {
        acc.push(place)
      }
      return acc
    }, [])

    console.log('Unique places after deduplication:', uniquePlaces.length)

    // Categorize places
    const categorizedPlaces = {
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

    return NextResponse.json({
      suggestions: gptSuggestions,
      places: categorizedPlaces,
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