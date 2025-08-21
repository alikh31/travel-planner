import { getCached, setCached, generateCacheKey, CACHE_TTLS } from './cache-manager'
import { trackGoogleMapsCall, checkGoogleMapsLimit } from './api-usage-tracker'

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''
const NEW_PLACES_API_BASE = 'https://places.googleapis.com/v1'

// Field masks for different data tiers
export const FIELD_MASKS = {
  BASIC: 'places.id,places.displayName,places.primaryType,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.formattedAddress',
  PREFERRED: 'places.id,places.displayName,places.primaryType,places.location,places.rating,places.userRatingCount,places.priceLevel,places.photos,places.formattedAddress,places.editorialSummary,places.reviews,places.currentOpeningHours',
  DETAILS_BASIC: 'id,displayName,primaryType,location,rating,userRatingCount,priceLevel,photos,formattedAddress',
  DETAILS_PREFERRED: 'id,displayName,primaryType,location,rating,userRatingCount,priceLevel,photos,formattedAddress,editorialSummary,reviews,currentOpeningHours'
}

interface SearchTextRequest {
  textQuery: string
  maxResultCount?: number
  locationBias?: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
  includedType?: string
  languageCode?: string
}

interface NearbySearchRequest {
  locationRestriction: {
    circle: {
      center: { latitude: number; longitude: number }
      radius: number
    }
  }
  includedTypes?: string[]
  maxResultCount?: number
  languageCode?: string
}

interface Place {
  id: string
  displayName?: { text: string; languageCode: string }
  primaryType?: string
  location?: { latitude: number; longitude: number }
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  photos?: Array<{
    name: string
    widthPx: number
    heightPx: number
    authorAttributions: Array<{ displayName: string; uri: string }>
  }>
  formattedAddress?: string
  editorialSummary?: { text: string; languageCode: string }
  reviews?: Array<{
    name: string
    rating: number
    text: { text: string; languageCode: string }
    authorAttribution: { displayName: string; uri: string }
    publishTime: string
  }>
  currentOpeningHours?: {
    openNow: boolean
    periods: Array<{
      open: { day: number; hour: number; minute: number }
      close: { day: number; hour: number; minute: number }
    }>
    weekdayDescriptions: string[]
  }
}

/**
 * Text search using new Places API
 */
export async function searchText(
  query: string,
  options: {
    maxResults?: number
    locationBias?: { lat: number; lng: number; radius?: number }
    includedType?: string
    usePreferred?: boolean
  } = {}
): Promise<Place[]> {
  const cacheKey = generateCacheKey({ query, ...options })
  
  // Check cache first
  const cached = await getCached<Place[]>(cacheKey, { subfolder: 'searches' })
  if (cached) return cached
  
  const request: SearchTextRequest = {
    textQuery: query,
    maxResultCount: options.maxResults || 20,
    languageCode: 'en'
  }
  
  if (options.locationBias) {
    request.locationBias = {
      circle: {
        center: {
          latitude: options.locationBias.lat,
          longitude: options.locationBias.lng
        },
        radius: options.locationBias.radius || 50000 // 50km default
      }
    }
  }
  
  if (options.includedType) {
    request.includedType = options.includedType
  }
  
  try {
    // Check API limits and track the call
    const canMakeCall = await checkGoogleMapsLimit('places-text-search')
    if (!canMakeCall) {
      throw new Error('Daily API limit exceeded for Google Places text search')
    }
    
    await trackGoogleMapsCall('places-text-search')
    
    const response = await fetch(`${NEW_PLACES_API_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': options.usePreferred ? FIELD_MASKS.PREFERRED : FIELD_MASKS.BASIC
      },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Places API Text Search error:', error)
      throw new Error(`Places API error: ${response.status}`)
    }
    
    const data = await response.json()
    const places = data.places || []
    
    // Cache the results
    await setCached(cacheKey, places, { subfolder: 'searches', ttl: CACHE_TTLS.SEARCHES })
    
    return places
  } catch (error) {
    console.error('Text search error:', error)
    return []
  }
}

/**
 * Nearby search using new Places API
 */
export async function searchNearby(
  location: { lat: number; lng: number },
  options: {
    radius?: number
    types?: string[]
    maxResults?: number
    usePreferred?: boolean
  } = {}
): Promise<Place[]> {
  const cacheKey = generateCacheKey({ location, ...options })
  
  // Check cache first
  const cached = await getCached<Place[]>(cacheKey, { subfolder: 'searches' })
  if (cached) return cached
  
  const request: NearbySearchRequest = {
    locationRestriction: {
      circle: {
        center: {
          latitude: location.lat,
          longitude: location.lng
        },
        radius: options.radius || 15000 // 15km default
      }
    },
    maxResultCount: options.maxResults || 20,
    languageCode: 'en'
  }
  
  if (options.types && options.types.length > 0) {
    request.includedTypes = options.types
  }
  
  try {
    // Check API limits and track the call
    const canMakeCall = await checkGoogleMapsLimit('places-nearby-search')
    if (!canMakeCall) {
      throw new Error('Daily API limit exceeded for Google Places nearby search')
    }
    
    await trackGoogleMapsCall('places-nearby-search')
    
    const response = await fetch(`${NEW_PLACES_API_BASE}/places:searchNearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': options.usePreferred ? FIELD_MASKS.PREFERRED : FIELD_MASKS.BASIC
      },
      body: JSON.stringify(request)
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Places API Nearby Search error:', error)
      throw new Error(`Places API error: ${response.status}`)
    }
    
    const data = await response.json()
    const places = data.places || []
    
    // Cache the results
    await setCached(cacheKey, places, { subfolder: 'searches', ttl: CACHE_TTLS.SEARCHES })
    
    return places
  } catch (error) {
    console.error('Nearby search error:', error)
    return []
  }
}

/**
 * Get place details using new Places API
 */
export async function getPlaceDetails(
  placeId: string,
  options: {
    usePreferred?: boolean
  } = {}
): Promise<Place | null> {
  const cacheKey = generateCacheKey({ placeId, ...options })
  
  // Check cache first
  const cached = await getCached<Place>(cacheKey, { subfolder: 'places' })
  if (cached) return cached
  
  try {
    // Check API limits and track the call
    const canMakeCall = await checkGoogleMapsLimit('places-details')
    if (!canMakeCall) {
      throw new Error('Daily API limit exceeded for Google Places details')
    }
    
    await trackGoogleMapsCall('places-details')
    
    const fieldMask = options.usePreferred ? FIELD_MASKS.DETAILS_PREFERRED : FIELD_MASKS.DETAILS_BASIC
    const response = await fetch(`${NEW_PLACES_API_BASE}/places/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': fieldMask
      }
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Places API Details error:', error)
      throw new Error(`Places API error: ${response.status}`)
    }
    
    const place = await response.json()
    
    // Cache the results
    await setCached(cacheKey, place, { subfolder: 'places', ttl: CACHE_TTLS.PLACES })
    
    return place
  } catch (error) {
    console.error('Place details error:', error)
    return null
  }
}

/**
 * Geocode an address to get coordinates
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = generateCacheKey({ geocode: address })
  
  // Check cache first
  const cached = await getCached<{ lat: number; lng: number }>(cacheKey, { subfolder: 'searches' })
  if (cached) return cached
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`
    )
    
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.status === 'OK' && data.results && data.results[0]) {
      const location = data.results[0].geometry.location
      const coords = { lat: location.lat, lng: location.lng }
      
      // Cache the results
      await setCached(cacheKey, coords, { subfolder: 'searches', ttl: CACHE_TTLS.SEARCHES })
      
      return coords
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

/**
 * Convert legacy place format to new format for backward compatibility
 */
export function convertLegacyPlace(place: Place): any {
  return {
    place_id: place.id,
    name: place.displayName?.text || '',
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    price_level: place.priceLevel ? parseInt(place.priceLevel.replace('PRICE_LEVEL_', '')) : undefined,
    vicinity: place.formattedAddress || '',
    opening_hours: place.currentOpeningHours ? {
      open_now: place.currentOpeningHours.openNow
    } : undefined,
    photos: place.photos?.map(photo => ({
      photo_reference: photo.name // Will be handled differently for image serving
    })),
    geometry: place.location ? {
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude
      }
    } : undefined,
    types: place.primaryType ? [place.primaryType.toLowerCase()] : [],
    editorial_summary: place.editorialSummary?.text,
    reviews: place.reviews?.map(review => ({
      text: review.text.text,
      rating: review.rating,
      author_name: review.authorAttribution.displayName
    }))
  }
}