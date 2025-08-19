import { NextRequest, NextResponse } from 'next/server'
import { getPlaceDetails, convertLegacyPlace } from '@/lib/google-maps-new'

export async function POST(request: NextRequest) {
  try {
    const { placeId } = await request.json()

    if (!placeId) {
      return NextResponse.json({ error: 'Place ID is required' }, { status: 400 })
    }

    // Fetch place details with preferred fields (includes reviews, editorial summary)
    const place = await getPlaceDetails(placeId, { usePreferred: true })
    
    if (!place) {
      return NextResponse.json({ success: false, error: 'Place not found' }, { status: 404 })
    }
    
    // Convert to legacy format for backward compatibility
    const legacyPlace = convertLegacyPlace(place)
    
    // Extract the enhanced data for the response
    const enhancedData = {
      photos: legacyPlace.photos || [],
      editorial_summary: legacyPlace.editorial_summary || null,
      reviews: legacyPlace.reviews || []
    }
    
    return NextResponse.json({ success: true, data: enhancedData })

  } catch (error) {
    console.error('Error in place details API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}