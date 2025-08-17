import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, types } = await request.json()

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    // Build search URL
    let searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    
    // Add type filters if provided
    if (types && types.length > 0) {
      searchUrl += `&type=${types.join('|')}`
    }

    const response = await fetch(searchUrl)
    const data = await response.json()

    if (!response.ok) {
      console.error('Google Places API error:', data)
      return NextResponse.json({ error: 'Failed to search places' }, { status: 500 })
    }

    // Transform the results to include only what we need
    const transformedResults = data.results?.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      price_level: place.price_level,
      vicinity: place.vicinity || place.formatted_address,
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