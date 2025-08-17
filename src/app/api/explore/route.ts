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

Please suggest 8-10 specific places to visit in ${itinerary.destination} including:
- Restaurants and cafes with local cuisine
- Bars and nightlife venues  
- Tourist attractions and museums
- Shopping areas and markets
- Parks and nature spots
- Cultural and historical sites

Focus on highly-rated, popular places that tourists love. Return only the place names, one per line, without numbers or bullet points.`

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
        max_tokens: 500,
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
      'park',
      'church'
    ]

    // Search for GPT suggestions
    for (const suggestion of gptSuggestions) {
      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(suggestion + ' ' + itinerary.destination)}&key=${googleApiKey}`
        console.log(`Searching for: "${suggestion}" in ${itinerary.destination}`)
        const response = await fetch(searchUrl)
        const data = await response.json()
        
        console.log(`Google API response status for "${suggestion}":`, data.status, 'Results:', data.results?.length || 0)
        
        if (data.status === 'REQUEST_DENIED') {
          console.error('Google Places API request denied:', data.error_message)
          break
        }
        
        if (data.results && data.results.length > 0) {
          // Take the first result for each suggestion
          const place = data.results[0]
          console.log(`Found place for "${suggestion}":`, place.name)
          allPlaces.push({
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
            source: 'gpt_suggestion'
          })
        }
      } catch (error) {
        console.error(`Error searching for ${suggestion}:`, error)
        continue
      }
    }

    // Search by category to fill out the results
    console.log('Searching by categories:', placeTypes)
    for (const type of placeTypes) {
      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(itinerary.destination)}&type=${type}&key=${googleApiKey}`
        console.log(`Searching for type "${type}" in ${itinerary.destination}`)
        const response = await fetch(searchUrl)
        const data = await response.json()
        
        console.log(`Google API response for type "${type}":`, data.status, 'Results:', data.results?.length || 0)
        
        if (data.status === 'REQUEST_DENIED') {
          console.error('Google Places API request denied for category search:', data.error_message)
          break
        }
        
        if (data.results && data.results.length > 0) {
          // Take top 3 results per category
          const categoryPlaces = data.results.slice(0, 3).map((place: any) => ({
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
            source: 'category_search'
          }))
          
          console.log(`Added ${categoryPlaces.length} places for type "${type}"`)
          allPlaces.push(...categoryPlaces)
        }
      } catch (error) {
        console.error(`Error searching for ${type}:`, error)
        continue
      }
    }

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
        place.types?.some((type: string) => ['tourist_attraction', 'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium'].includes(type))
      ),
      shopping: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['shopping_mall', 'store', 'market', 'clothing_store'].includes(type))
      ),
      nature: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['park', 'natural_feature', 'hiking_area', 'campground'].includes(type))
      ),
      culture: uniquePlaces.filter((place: any) => 
        place.types?.some((type: string) => ['church', 'hindu_temple', 'mosque', 'synagogue', 'library', 'city_hall', 'monument'].includes(type))
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