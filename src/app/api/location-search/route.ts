import { NextRequest, NextResponse } from 'next/server'
import { getCached, setCached, generateCacheKey } from '@/lib/cache-manager'

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 })
    }

    // Generate cache key
    const cacheKey = generateCacheKey({ query: query.trim() })
    
    // Check cache first
    const cached = await getCached(cacheKey, { subfolder: 'searches' })
    if (cached) {
      return NextResponse.json(cached)
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Use legacy Places API for now as it's more reliable for text search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query.trim())}&key=${apiKey}`

    const response = await fetch(searchUrl)

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Google Places API error:', response.status, errorData)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error status:', data.status, data.error_message)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Transform to consistent format
    const results = data.results?.slice(0, 8).map((place: any) => ({
      place_id: place.place_id,
      name: place.name || '',
      formatted_address: place.formatted_address || '',
      geometry: {
        location: {
          lat: place.geometry?.location?.lat || 0,
          lng: place.geometry?.location?.lng || 0
        }
      }
    })) || []

    const result = { 
      success: true,
      results
    }

    // Cache for 24 hours (shorter than other searches since location data can change)
    await setCached(cacheKey, result, { subfolder: 'searches', ttl: 24 * 60 * 60 * 1000 })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Location search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}