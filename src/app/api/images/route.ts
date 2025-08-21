import { NextRequest, NextResponse } from 'next/server'
import { getCachedBinary, setCachedBinary, generateCacheKey, CACHE_TTLS } from '@/lib/cache-manager'
import { trackGoogleMapsCall, checkGoogleMapsLimit } from '@/lib/api-usage-tracker'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''
const NEW_PLACES_API_BASE = 'https://places.googleapis.com/v1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const photoName = searchParams.get('name')
    const maxWidth = searchParams.get('maxWidth') || '1600'
    const legacy = searchParams.get('legacy') === 'true'
    
    if (!photoName) {
      return NextResponse.json({ error: 'Photo name is required' }, { status: 400 })
    }
    
    // Generate cache key based on photo name and size
    const cacheKey = generateCacheKey({ photoName, maxWidth })
    
    // Check cache first
    const cached = await getCachedBinary(cacheKey, 'jpg')
    if (cached) {
      return new NextResponse(cached as BodyInit, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400', // Browser cache for 1 day
        },
      })
    }
    
    // Check API usage limits before making the call
    const canMakeCall = await checkGoogleMapsLimit('places-photo')
    if (!canMakeCall) {
      return NextResponse.json(
        { error: 'Daily API limit exceeded for Google Places photos' },
        { status: 429 }
      )
    }
    
    // Track the API call
    await trackGoogleMapsCall('places-photo')
    
    let imageUrl: string
    
    // Determine if this is a new Places API photo name or legacy photo reference
    const isNewAPIPhotoName = photoName.startsWith('places/') && photoName.includes('/photos/')
    
    if (legacy && !isNewAPIPhotoName) {
      // Legacy API format (photo_reference)
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoName}&key=${GOOGLE_API_KEY}`
    } else if (isNewAPIPhotoName) {
      // New API format (full photo name like "places/ChIJ.../photos/ATKogpe...")
      imageUrl = `${NEW_PLACES_API_BASE}/${photoName}/media?maxWidthPx=${maxWidth}&key=${GOOGLE_API_KEY}`
    } else {
      // Fallback to legacy format for unknown formats
      imageUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoName}&key=${GOOGLE_API_KEY}`
    }
    
    // Fetch image from Google
    const response = await fetch(imageUrl)
    
    if (!response.ok) {
      console.error('Failed to fetch image from Google:', response.status)
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status })
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer())
    
    // Cache the image
    await setCachedBinary(cacheKey, imageBuffer, 'jpg', CACHE_TTLS.IMAGES)
    
    return new NextResponse(imageBuffer as BodyInit, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('Image API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}