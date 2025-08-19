import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCached, setCached, generateCacheKey, CACHE_TTLS } from '@/lib/cache-manager'

export async function POST(request: NextRequest) {
  try {
    // Allow unauthenticated access for basic location search

    const { query, types } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Generate cache key
    const cacheKey = generateCacheKey({ query, types })
    
    // Check cache first
    const cached = await getCached(cacheKey, { subfolder: 'searches' })
    if (cached) {
      return NextResponse.json(cached)
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    // Use new Places API Text Search
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText'
    
    const requestBody = {
      textQuery: query,
      maxResultCount: 10,
      // Only request basic fields for autocomplete-style search
      fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location,places.types'
    }

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': requestBody.fieldMask
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Google Places API error:', data)
      return NextResponse.json({ error: 'Failed to search places' }, { status: 500 })
    }

    // Transform new API results to match legacy format for backward compatibility
    const transformedResults = data.places?.map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || '',
      formatted_address: place.formattedAddress || '',
      geometry: {
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0
        }
      },
      types: place.types || []
    })) || []

    const result = { 
      results: transformedResults,
      status: 'OK'
    }

    // Cache the result
    await setCached(cacheKey, result, { subfolder: 'searches', ttl: CACHE_TTLS.SEARCHES })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error searching places:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// For nearby search using coordinates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const radius = searchParams.get('radius') || '5000'
    const type = searchParams.get('type')
    const keyword = searchParams.get('keyword')

    if (!location) {
      return NextResponse.json({ error: 'Location is required (lat,lng format)' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    // Build nearby search URL
    let searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location}&radius=${radius}&key=${apiKey}`
    
    if (type) {
      searchUrl += `&type=${type}`
    }
    
    if (keyword) {
      searchUrl += `&keyword=${encodeURIComponent(keyword)}`
    }

    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('Google Places API error:', data)
      return NextResponse.json({ error: 'Failed to search nearby places' }, { status: 500 })
    }

    // Transform the results to include only what we need
    const transformedResults = data.results?.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      vicinity: place.vicinity,
      opening_hours: place.opening_hours,
      photos: place.photos,
      geometry: place.geometry,
      types: place.types
    })) || []

    return NextResponse.json({ 
      results: transformedResults,
      status: data.status 
    })

  } catch (error) {
    console.error('Error searching nearby places:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}