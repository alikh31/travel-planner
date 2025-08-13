'use client'

/// <reference path="../types/google-maps.d.ts" />

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { MapPin, X } from 'lucide-react'

interface Activity {
  id: string
  title: string
  description?: string
  location?: string
  locationPlaceId?: string
  locationLat?: number
  locationLng?: number
  startTime?: string
  duration?: number
}

interface ActivitiesMapProps {
  activities: Activity[]
  selectedDay?: string // Keep for compatibility but don't use
  onClose?: () => void
  isModal?: boolean
  className?: string
  accommodationLocation?: string // For routes from/to accommodation
}

const ActivitiesMap = memo(function ActivitiesMap({ 
  activities, 
  selectedDay, // eslint-disable-line @typescript-eslint/no-unused-vars
  onClose, 
  isModal = false,
  className = "",
  accommodationLocation 
}: ActivitiesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routesRef = useRef<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter activities that have location data
  const activitiesWithLocation = activities.filter(
    activity => activity.location && (activity.locationLat && activity.locationLng)
  )

  const initializeMap = useCallback(async () => {
    if (!mapRef.current || activitiesWithLocation.length === 0) {
      setIsLoading(false)
      return
    }

    try {
      // Import Google Maps
      const { loadGoogleMaps } = await import('../lib/googleMaps')
      const google = await loadGoogleMaps()
      
      if (!google) {
        setError('Failed to load Google Maps')
        setIsLoading(false)
        return
      }

      // Create bounds to fit all activities
      const bounds = new google.maps.LatLngBounds()
      
      // Create map
      const map = new google.maps.Map(mapRef.current, {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true, // Remove all default controls
        zoomControl: true, // Keep only zoom control
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      })

      mapInstanceRef.current = map

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current = []

      // Add accommodation marker if available
      if (accommodationLocation) {
        try {
          const { loadGoogleMaps } = await import('../lib/googleMaps')
          const google = await loadGoogleMaps()
          
          if (google) {
            const geocoder = new google.maps.Geocoder()
            
            // Geocode accommodation location to get coordinates
            geocoder.geocode({ address: accommodationLocation }, (results: any, status: any) => {
              if (status === 'OK' && results && results[0]) {
                const accommodationPos = results[0].geometry.location
                bounds.extend(accommodationPos)

                // Create accommodation marker (hotel icon)
                const accommodationMarker = new google.maps.Marker({
                  position: accommodationPos,
                  map,
                  title: 'Accommodation',
                  label: {
                    text: '🏨',
                    fontSize: '20px'
                  },
                  icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#10B981', // Green for accommodation
                    fillOpacity: 1,
                    strokeColor: '#059669',
                    strokeWeight: 2,
                    scale: 20
                  }
                })

                // Create info window for accommodation
                const accommodationInfoWindow = new google.maps.InfoWindow({
                  content: `
                    <div style="padding: 8px; max-width: 200px;">
                      <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #111827;">🏨 Accommodation</h4>
                      <p style="margin: 0; font-size: 11px; color: #9CA3AF;">${accommodationLocation}</p>
                    </div>
                  `
                })

                accommodationMarker.addListener('click', () => {
                  accommodationInfoWindow.open(map, accommodationMarker)
                })

                markersRef.current.push(accommodationMarker)
                
                // Update map bounds after adding accommodation
                if (activitiesWithLocation.length === 0) {
                  map.setCenter(accommodationPos)
                  map.setZoom(15)
                } else {
                  map.fitBounds(bounds)
                  const padding = { top: 50, right: 50, bottom: 50, left: 50 }
                  map.fitBounds(bounds, padding)
                }
              }
            })
          }
        } catch (error) {
          console.warn('Error adding accommodation marker:', error)
        }
      }

      // Add markers for each activity
      activitiesWithLocation.forEach((activity, index) => {
        if (activity.locationLat && activity.locationLng) {
          const position = { lat: activity.locationLat, lng: activity.locationLng }
          bounds.extend(position)

          // Create custom marker with number
          const marker = new google.maps.Marker({
            position,
            map,
            title: activity.title,
            label: {
              text: ((activity as any).activityNumber || (index + 1)).toString(),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px'
            },
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#3B82F6',
              fillOpacity: 1,
              strokeColor: '#1E40AF',
              strokeWeight: 2,
              scale: 15
            }
          })

          // Create info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <h4 style="margin: 0 0 4px 0; font-weight: 600; color: #111827;">${activity.title}</h4>
                ${activity.description ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280;">${activity.description}</p>` : ''}
                <p style="margin: 0; font-size: 11px; color: #9CA3AF;">${activity.location}</p>
                ${activity.startTime ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #6B7280;">Time: ${activity.startTime}</p>` : ''}
              </div>
            `
          })

          marker.addListener('click', () => {
            infoWindow.open(map, marker)
          })

          markersRef.current.push(marker)
        }
      })

      // Helper function to get saved transport preference for a route
      const getTransportPreference = (fromLocation: string, toLocation: string): any => {
        const routeKey = `transport_${fromLocation.replace(/\s+/g, '_')}_to_${toLocation.replace(/\s+/g, '_')}`
        try {
          const savedTransport = localStorage.getItem(routeKey) as 'driving' | 'walking' | 'transit' | 'bicycling'
          const modeMap: Record<string, any> = {
            'driving': google.maps.TravelMode.DRIVING,
            'walking': google.maps.TravelMode.WALKING,
            'transit': google.maps.TravelMode.TRANSIT,
            'bicycling': google.maps.TravelMode.BICYCLING
          }
          return modeMap[savedTransport] || google.maps.TravelMode.TRANSIT
        } catch {
          return google.maps.TravelMode.TRANSIT
        }
      }

      // Clear existing routes
      routesRef.current.forEach(renderer => renderer.setMap(null))
      routesRef.current = []

      // Draw routes between activities
      const directionsService = new google.maps.DirectionsService()
      
      // Create routes between consecutive activities
      for (let i = 0; i < activitiesWithLocation.length - 1; i++) {
        const fromActivity = activitiesWithLocation[i]
        const toActivity = activitiesWithLocation[i + 1]
        
        if (fromActivity.location && toActivity.location) {
          const travelMode = getTransportPreference(fromActivity.location, toActivity.location)
          
          const routeRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true, // Don't show default markers, we have custom ones
            polylineOptions: {
              strokeColor: '#4285F4',
              strokeWeight: 3,
              strokeOpacity: 0.8,
            }
          })
          
          routeRenderer.setMap(map)
          routesRef.current.push(routeRenderer)
          
          // Request directions
          directionsService.route({
            origin: { lat: fromActivity.locationLat!, lng: fromActivity.locationLng! },
            destination: { lat: toActivity.locationLat!, lng: toActivity.locationLng! },
            travelMode: travelMode,
          }, (result: any, status: any) => {
            if (status === 'OK' && result) {
              routeRenderer.setDirections(result)
            } else {
              console.warn(`Could not fetch directions between ${fromActivity.title} and ${toActivity.title}:`, status)
            }
          })
        }
      }

      // Add routes from accommodation to first activity and last activity to accommodation
      if (accommodationLocation && activitiesWithLocation.length > 0) {
        // Route from accommodation to first activity
        const firstActivity = activitiesWithLocation[0]
        if (firstActivity.location) {
          const travelMode = getTransportPreference(accommodationLocation, firstActivity.location)
          
          const accommodationToFirstRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#10B981', // Green for accommodation routes
              strokeWeight: 3,
              strokeOpacity: 0.8,
              strokePattern: [10, 5], // Dashed line for accommodation routes
            }
          })
          
          accommodationToFirstRenderer.setMap(map)
          routesRef.current.push(accommodationToFirstRenderer)
          
          directionsService.route({
            origin: accommodationLocation,
            destination: { lat: firstActivity.locationLat!, lng: firstActivity.locationLng! },
            travelMode: travelMode,
          }, (result: any, status: any) => {
            if (status === 'OK' && result) {
              accommodationToFirstRenderer.setDirections(result)
            }
          })
        }

        // Route from last activity to accommodation
        const lastActivity = activitiesWithLocation[activitiesWithLocation.length - 1]
        if (lastActivity.location) {
          const travelMode = getTransportPreference(lastActivity.location, accommodationLocation)
          
          const lastToAccommodationRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#8B5CF6', // Purple for return routes
              strokeWeight: 3,
              strokeOpacity: 0.8,
              strokePattern: [10, 5], // Dashed line for accommodation routes
            }
          })
          
          lastToAccommodationRenderer.setMap(map)
          routesRef.current.push(lastToAccommodationRenderer)
          
          directionsService.route({
            origin: { lat: lastActivity.locationLat!, lng: lastActivity.locationLng! },
            destination: accommodationLocation,
            travelMode: travelMode,
          }, (result: any, status: any) => {
            if (status === 'OK' && result) {
              lastToAccommodationRenderer.setDirections(result)
            }
          })
        }
      }

      // Fit map to show all markers
      if (activitiesWithLocation.length === 1) {
        map.setCenter(bounds.getCenter())
        map.setZoom(15)
      } else if (activitiesWithLocation.length > 1) {
        map.fitBounds(bounds)
        // Add some padding
        const padding = { top: 50, right: 50, bottom: 50, left: 50 }
        map.fitBounds(bounds, padding)
      }

      setIsLoading(false)
    } catch (error) {
      console.error('Error initializing map:', error)
      setError('Failed to load map')
      setIsLoading(false)
    }
  }, [activitiesWithLocation])

  // Handle transport mode changes from TimeGap components
  useEffect(() => {
    const handleTransportModeChange = async (event: CustomEvent) => {
      const { } = event.detail
      
      if (!mapInstanceRef.current) return
      
      try {
        const { loadGoogleMaps } = await import('../lib/googleMaps')
        const google = await loadGoogleMaps()
        
        if (!google) return
        
        const directionsService = new google.maps.DirectionsService()
        
        // Clear existing routes
        routesRef.current.forEach(renderer => renderer.setMap(null))
        routesRef.current = []
        
        const getTransportPreference = (fromLoc: string, toLoc: string): any => {
          const routeKey = `transport_${fromLoc.replace(/\s+/g, '_')}_to_${toLoc.replace(/\s+/g, '_')}`
          try {
            const savedTransport = localStorage.getItem(routeKey) as 'driving' | 'walking' | 'transit' | 'bicycling'
            const modeMap: Record<string, any> = {
              'driving': google.maps.TravelMode.DRIVING,
              'walking': google.maps.TravelMode.WALKING,
              'transit': google.maps.TravelMode.TRANSIT,
              'bicycling': google.maps.TravelMode.BICYCLING
            }
            return modeMap[savedTransport] || google.maps.TravelMode.TRANSIT
          } catch {
            return google.maps.TravelMode.TRANSIT
          }
        }

        // Redraw routes between consecutive activities
        for (let i = 0; i < activitiesWithLocation.length - 1; i++) {
          const fromActivity = activitiesWithLocation[i]
          const toActivity = activitiesWithLocation[i + 1]
          
          if (fromActivity.location && toActivity.location) {
            const travelMode = getTransportPreference(fromActivity.location, toActivity.location)
            
            const routeRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4285F4',
                strokeWeight: 3,
                strokeOpacity: 0.8,
              }
            })
            
            routeRenderer.setMap(mapInstanceRef.current)
            routesRef.current.push(routeRenderer)
            
            directionsService.route({
              origin: { lat: fromActivity.locationLat!, lng: fromActivity.locationLng! },
              destination: { lat: toActivity.locationLat!, lng: toActivity.locationLng! },
              travelMode: travelMode,
            }, (result: any, status: any) => {
              if (status === 'OK' && result) {
                routeRenderer.setDirections(result)
              }
            })
          }
        }

        // Redraw accommodation routes if available
        if (accommodationLocation && activitiesWithLocation.length > 0) {
          // Route from accommodation to first activity
          const firstActivity = activitiesWithLocation[0]
          if (firstActivity.location) {
            const travelMode = getTransportPreference(accommodationLocation, firstActivity.location)
            
            const accommodationToFirstRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#10B981',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                strokePattern: [10, 5],
              }
            })
            
            accommodationToFirstRenderer.setMap(mapInstanceRef.current)
            routesRef.current.push(accommodationToFirstRenderer)
            
            directionsService.route({
              origin: accommodationLocation,
              destination: { lat: firstActivity.locationLat!, lng: firstActivity.locationLng! },
              travelMode: travelMode,
            }, (result: any, status: any) => {
              if (status === 'OK' && result) {
                accommodationToFirstRenderer.setDirections(result)
              }
            })
          }

          // Route from last activity to accommodation
          const lastActivity = activitiesWithLocation[activitiesWithLocation.length - 1]
          if (lastActivity.location) {
            const travelMode = getTransportPreference(lastActivity.location, accommodationLocation)
            
            const lastToAccommodationRenderer = new google.maps.DirectionsRenderer({
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#8B5CF6',
                strokeWeight: 3,
                strokeOpacity: 0.8,
                strokePattern: [10, 5],
              }
            })
            
            lastToAccommodationRenderer.setMap(mapInstanceRef.current)
            routesRef.current.push(lastToAccommodationRenderer)
            
            directionsService.route({
              origin: { lat: lastActivity.locationLat!, lng: lastActivity.locationLng! },
              destination: accommodationLocation,
              travelMode: travelMode,
            }, (result: any, status: any) => {
              if (status === 'OK' && result) {
                lastToAccommodationRenderer.setDirections(result)
              }
            })
          }
        }
        
      } catch (error) {
        console.error('Error updating routes:', error)
      }
    }

    // Add event listener
    window.addEventListener('transportModeChanged', handleTransportModeChange as any)
    
    // Cleanup
    return () => {
      window.removeEventListener('transportModeChanged', handleTransportModeChange as any)
    }
  }, [activitiesWithLocation, accommodationLocation])

  useEffect(() => {
    initializeMap()
  }, [initializeMap])

  if (activitiesWithLocation.length === 0) {
    return (
      <div className={`${className} ${isModal ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50' : ''}`}>
        <div className={`bg-white rounded-lg ${isModal ? 'shadow-xl max-w-4xl w-full max-h-[90vh]' : 'h-full'} flex flex-col`}>
          {isModal && (
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Activities Map</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No activities with location data to display on map</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className} ${isModal ? 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50' : ''}`}>
      <div className={`bg-white rounded-lg ${isModal ? 'shadow-xl max-w-4xl w-full max-h-[90vh]' : 'h-full'} flex flex-col`}>
        {isModal && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Activities Map</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-b-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-b-lg">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-red-300 mx-auto mb-2" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>
          )}
          
          <div 
            ref={mapRef} 
            className={`w-full ${isModal ? 'h-[60vh]' : 'h-full'} rounded-b-lg`}
          />
        </div>
      </div>
    </div>
  )
})

export default ActivitiesMap