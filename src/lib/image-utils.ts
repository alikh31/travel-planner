/**
 * Get place photo using backend API with caching
 */
export const getPlacePhotoFromBackend = async (placeId: string, maxWidth: number = 400): Promise<string | null> => {
  if (!placeId) return null
  
  try {
    // First try to get place details to get the photo reference
    const response = await fetch('/api/place-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId })
    })
    
    if (!response.ok) {
      console.warn('Failed to get place details for photo')
      return null
    }
    
    const data = await response.json()
    
    if (data.success && data.data.photos && data.data.photos.length > 0) {
      // Get the first photo reference
      const photoReference = data.data.photos[0].photo_reference
      
      // Return the backend image URL
      return `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=${maxWidth}&legacy=true`
    }
    
    return null
  } catch (error) {
    console.error('Error fetching place photo from backend:', error)
    return null
  }
}

/**
 * Convert a Google Photos URL to use our backend (if it's a Google photo URL)
 */
export const convertToBackendImageUrl = (photoUrl: string, maxWidth: number = 400): string => {
  // If it's already a backend URL, return as is
  if (photoUrl.startsWith('/api/images')) {
    return photoUrl
  }
  
  // If it's a Google Maps photo URL, extract the photo reference and use backend
  if (photoUrl.includes('maps.googleapis.com/maps/api/place/photo')) {
    try {
      const url = new URL(photoUrl)
      const photoReference = url.searchParams.get('photo_reference')
      
      if (photoReference) {
        return `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=${maxWidth}&legacy=true`
      }
    } catch (error) {
      console.warn('Failed to parse Google Maps photo URL:', error)
    }
  }
  
  // If it's a new Places API photo URL, extract the photo name and use backend
  if (photoUrl.includes('places.googleapis.com/v1/places/')) {
    try {
      const url = new URL(photoUrl)
      // Extract photo name from URL path like "/v1/places/ChIJ.../photos/ATKogpe.../media"
      const pathMatch = url.pathname.match(/\/v1\/(places\/[^\/]+\/photos\/[^\/]+)\/media/)
      if (pathMatch) {
        const photoName = pathMatch[1]
        return `/api/images?name=${encodeURIComponent(photoName)}&maxWidth=${maxWidth}`
      }
    } catch (error) {
      console.warn('Failed to parse new Places API photo URL:', error)
    }
  }
  
  // For other URLs (like direct image URLs, Airbnb photos, etc.), return as is
  return photoUrl
}

/**
 * Get optimized image URL for different sizes
 */
export const getOptimizedImageUrl = (photoReference: string, options: {
  maxWidth?: number
  maxHeight?: number
  legacy?: boolean
} = {}): string => {
  const { maxWidth = 400, legacy } = options
  
  // Auto-detect if it's a new Places API photo name
  const isNewAPIPhotoName = photoReference.startsWith('places/') && photoReference.includes('/photos/')
  const shouldUseLegacy = legacy !== undefined ? legacy : !isNewAPIPhotoName
  
  return `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=${maxWidth}${shouldUseLegacy ? '&legacy=true' : ''}`
}