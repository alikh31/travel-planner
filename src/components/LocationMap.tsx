'use client'

import { useEffect, useRef } from 'react'

interface LocationMapProps {
  location: string
  className?: string
  height?: string
}

export default function LocationMap({ 
  location, 
  className = "", 
  height = "200px" 
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // If no location, don't show anything
    if (!location?.trim()) {
      return
    }

    // Simple function to initialize map
    const initMap = async () => {
      try {
        // Wait a bit for DOM
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check if element exists
        if (!mapRef.current) {
          console.error('Map element not found')
          return
        }

        // Load Google Maps
        const { loadGoogleMaps } = await import('../lib/googleMaps')
        const google = await loadGoogleMaps()
        
        if (!google) {
          console.error('Failed to load Google Maps')
          return
        }
        
        // Simple geocoding
        const geocoder = new google.maps.Geocoder()
        
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === google.maps.GeocoderStatus.OK && results && results[0] && mapRef.current) {
            const position = results[0].geometry.location
            
            // Create map
            const map = new google.maps.Map(mapRef.current, {
              center: position,
              zoom: 15,
              disableDefaultUI: true,
            })
            
            // Add marker
            new google.maps.Marker({
              position: position,
              map: map,
              title: location,
            })
          }
        })

      } catch (error) {
        console.error('Map error:', error)
      }
    }

    initMap()
  }, [location])

  // Don't render anything if no location
  if (!location?.trim()) {
    return null
  }

  return (
    <div 
      ref={mapRef} 
      className={`bg-gray-100 rounded-lg ${className}`}
      style={{ height }}
    >
      {/* Map will be rendered here by Google Maps */}
    </div>
  )
}