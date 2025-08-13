import { Loader } from '@googlemaps/js-api-loader'

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key not found. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.')
}

// Initialize Google Maps loader
let loader: Loader | null = null

const createLoader = () => {
  if (!loader && GOOGLE_MAPS_API_KEY) {
    loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry', 'routes'],
      region: 'US',
      language: 'en',
    })
  }
  return loader
}

let google: typeof globalThis.google | null = null

export const loadGoogleMaps = async (): Promise<typeof globalThis.google | null> => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is required')
    return null
  }

  if (google) {
    return google
  }

  try {
    const loaderInstance = createLoader()
    if (!loaderInstance) {
      console.error('Failed to create Google Maps loader')
      return null
    }
    
    google = await loaderInstance.load()
    return google
  } catch (error) {
    console.error('Error loading Google Maps:', error)
    return null
  }
}

export interface PlaceResult {
  name: string
  formatted_address: string
  place_id: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  types: string[]
}

export const searchPlaces = async (query: string): Promise<PlaceResult[]> => {
  const google = await loadGoogleMaps()
  if (!google) {
    return []
  }

  try {
    // Use the new Place API for text search
    const { Place } = google.maps.places
    
    const request = {
      textQuery: query,
      fields: ['displayName', 'formattedAddress', 'location', 'id', 'types'],
      maxResultCount: 5,
    }
    
    const { places } = await Place.searchByText(request)
    
    if (places && places.length > 0) {
      return places.map((place) => ({
        name: place.displayName || '',
        formatted_address: place.formattedAddress || '',
        place_id: place.id || '',
        geometry: {
          location: {
            lat: place.location?.lat() || 0,
            lng: place.location?.lng() || 0,
          }
        },
        types: place.types || [],
      }))
    }
    
    return []
  } catch (error) {
    console.error('Error with new Places API, falling back to legacy API:', error)
    
    // Fallback to legacy PlacesService if new API fails
    return new Promise((resolve) => {
      const service = new google.maps.places.PlacesService(document.createElement('div'))
      
      service.textSearch(
        {
          query,
          type: 'establishment',
        },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            const places: PlaceResult[] = results.slice(0, 5).map((place) => ({
              name: place.name || '',
              formatted_address: place.formatted_address || '',
              place_id: place.place_id || '',
              geometry: {
                location: {
                  lat: place.geometry?.location?.lat() || 0,
                  lng: place.geometry?.location?.lng() || 0,
                }
              },
              types: place.types || [],
            }))
            resolve(places)
          } else {
            resolve([])
          }
        }
      )
    })
  }
}

export const geocodeAddress = async (address: string): Promise<PlaceResult | null> => {
  const google = await loadGoogleMaps()
  if (!google) return null

  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder()
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const result = results[0]
        resolve({
          name: result.formatted_address || '',
          formatted_address: result.formatted_address || '',
          place_id: result.place_id || '',
          geometry: {
            location: {
              lat: result.geometry?.location?.lat() || 0,
              lng: result.geometry?.location?.lng() || 0,
            }
          },
          types: result.types || [],
        })
      } else {
        resolve(null)
      }
    })
  })
}

export const getPlacePhoto = async (placeId: string): Promise<string | null> => {
  const google = await loadGoogleMaps()
  if (!google) return null

  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'))
    
    service.getDetails(
      {
        placeId,
        fields: ['photos']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos && place.photos.length > 0) {
          // Get the first photo with a reasonable size
          const photoUrl = place.photos[0].getUrl({
            maxWidth: 400,
            maxHeight: 300
          })
          resolve(photoUrl)
        } else {
          resolve(null)
        }
      }
    )
  })
}