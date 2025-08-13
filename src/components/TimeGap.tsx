'use client'

import { useState, useEffect } from 'react'
import { Plus, Clock, MapPin, Car, Bus, PersonStanding, Navigation, Bike, ChevronDown, ChevronUp } from 'lucide-react'

interface TimeGapProps {
  startTime?: string
  endTime?: string
  fromLocation?: string
  toLocation?: string
  onAddActivity: () => void
  className?: string
  isAccommodationCommute?: boolean
  commuteType?: 'start' | 'end' // 'start' for accommodation-to-activity, 'end' for activity-to-accommodation
}

type TransportMode = 'driving' | 'walking' | 'transit' | 'bicycling'

interface TransportOption {
  mode: TransportMode
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
}

interface TransitStep {
  mode: string // 'WALKING' | 'TRANSIT'
  instructions: string
  duration: string
  distance: string
  transitDetails?: {
    line: string
    vehicle: string
    departureStop: string
    arrivalStop: string
    departureTime?: string
    arrivalTime?: string
    numStops?: number
  }
}

interface TransitDirection {
  steps: TransitStep[]
  totalDuration: string
  totalDistance: string
}

export default function TimeGap({ 
  startTime, 
  endTime,
  fromLocation,
  toLocation, 
  onAddActivity,
  className = "",
  isAccommodationCommute = false,
  commuteType
}: TimeGapProps) {
  // Create unique key for this route to store transport preference
  const routeKey = `transport_${fromLocation?.replace(/\s+/g, '_')}_to_${toLocation?.replace(/\s+/g, '_')}`
  
  // Load transport preference from localStorage or default to transit
  const getInitialTransport = (): TransportMode => {
    if (!fromLocation || !toLocation) return 'transit'
    try {
      const savedTransport = localStorage.getItem(routeKey)
      return (savedTransport as TransportMode) || 'transit'
    } catch {
      return 'transit'
    }
  }

  const [selectedTransport, setSelectedTransport] = useState<TransportMode>(getInitialTransport())
  const [travelTime, setTravelTime] = useState<string>('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [transitDirections, setTransitDirections] = useState<TransitDirection | null>(null)
  const [showTransitDetails, setShowTransitDetails] = useState(true)
  const [isLoadingTransit, setIsLoadingTransit] = useState(false)

  const transportOptions: TransportOption[] = [
    { mode: 'walking', icon: PersonStanding, label: 'Walk', color: 'text-green-600' },
    { mode: 'driving', icon: Car, label: 'Drive', color: 'text-blue-600' },
    { mode: 'transit', icon: Bus, label: 'Transit', color: 'text-purple-600' },
    { mode: 'bicycling', icon: Bike, label: 'Bike', color: 'text-orange-600' },
  ]

  // Generate Google Maps URL with origin, destination, and transport mode
  const getGoogleMapsUrl = (origin: string, destination: string, travelMode: TransportMode): string => {
    const baseUrl = 'https://www.google.com/maps/dir/'
    const encodedOrigin = encodeURIComponent(origin)
    const encodedDestination = encodeURIComponent(destination)
    
    // Google Maps URL parameters for travel mode (correct values from official docs)
    const modeMap = {
      driving: 'driving',
      walking: 'walking', 
      transit: 'transit',
      bicycling: 'bicycling'
    }
    
    const mode = modeMap[travelMode] || 'driving'
    return `${baseUrl}?api=1&origin=${encodedOrigin}&destination=${encodedDestination}&travelmode=${mode}`
  }

  // Handle transport option click - update selected transport and persist preference
  const handleTransportClick = (mode: TransportMode) => {
    setSelectedTransport(mode)
    
    // Persist transport choice for this route
    try {
      localStorage.setItem(routeKey, mode)
      
      // Dispatch a custom event to notify map to update routes
      window.dispatchEvent(new CustomEvent('transportModeChanged', {
        detail: {
          routeKey,
          mode,
          fromLocation,
          toLocation
        }
      }))
    } catch (error) {
      console.warn('Failed to save transport preference:', error)
    }
  }

  // Fetch detailed transit directions
  const fetchTransitDirections = async () => {
    if (!fromLocation || !toLocation || selectedTransport !== 'transit') return

    setIsLoadingTransit(true)
    try {
      const { loadGoogleMaps } = await import('../lib/googleMaps')
      const google = await loadGoogleMaps()
      
      if (!google) {
        throw new Error('Failed to load Google Maps')
      }

      const directionsService = new google.maps.DirectionsService()
      
      const request = {
        origin: fromLocation,
        destination: toLocation,
        travelMode: google.maps.TravelMode.TRANSIT,
        unitSystem: google.maps.UnitSystem.METRIC,
        provideRouteAlternatives: false
      }

      directionsService.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0]
          const leg = route.legs[0]
          
          const steps: TransitStep[] = leg.steps.map(step => {
            if (step.travel_mode === google.maps.TravelMode.TRANSIT && step.transit) {
              return {
                mode: 'TRANSIT',
                instructions: step.instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
                duration: step.duration?.text || '',
                distance: step.distance?.text || '',
                transitDetails: {
                  line: step.transit.line.short_name || step.transit.line.name || '',
                  vehicle: step.transit.line.vehicle.type || 'Transit',
                  departureStop: step.transit.departure_stop.name || '',
                  arrivalStop: step.transit.arrival_stop.name || '',
                  departureTime: step.transit.departure_time?.text || '',
                  arrivalTime: step.transit.arrival_time?.text || '',
                  numStops: step.transit.num_stops || 0
                }
              }
            } else {
              return {
                mode: 'WALKING',
                instructions: step.instructions.replace(/<[^>]*>/g, ''),
                duration: step.duration?.text || '',
                distance: step.distance?.text || ''
              }
            }
          })

          setTransitDirections({
            steps,
            totalDuration: leg.duration?.text || '',
            totalDistance: leg.distance?.text || ''
          })
        } else {
          console.error('Transit directions request failed:', status)
          setTransitDirections(null)
        }
        setIsLoadingTransit(false)
      })
    } catch (error) {
      console.error('Error fetching transit directions:', error)
      setTransitDirections(null)
      setIsLoadingTransit(false)
    }
  }

  // Handle directions button click - open Google Maps with selected transport
  const handleGetDirections = () => {
    if (fromLocation && toLocation) {
      const mapsUrl = getGoogleMapsUrl(fromLocation, toLocation, selectedTransport)
      window.open(mapsUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // Calculate travel time between locations
  useEffect(() => {
    if (!fromLocation || !toLocation || fromLocation === toLocation) {
      setTravelTime('')
      return
    }

    const calculateTravelTime = async () => {
      setIsCalculating(true)
      try {
        const { loadGoogleMaps } = await import('../lib/googleMaps')
        const google = await loadGoogleMaps()
        
        if (!google) {
          throw new Error('Failed to load Google Maps')
        }
        const service = new google.maps.DistanceMatrixService()

        service.getDistanceMatrix(
          {
            origins: [fromLocation],
            destinations: [toLocation],
            travelMode: selectedTransport === 'driving' ? google.maps.TravelMode.DRIVING :
                       selectedTransport === 'walking' ? google.maps.TravelMode.WALKING :
                       selectedTransport === 'transit' ? google.maps.TravelMode.TRANSIT :
                       google.maps.TravelMode.BICYCLING,
            avoidHighways: false,
            avoidTolls: false
          },
          (response, status) => {
            if (status === google.maps.DistanceMatrixStatus.OK && response) {
              const element = response.rows[0]?.elements[0]
              if (element && element.status === 'OK') {
                setTravelTime(element.duration?.text || '')
              } else {
                setTravelTime('Unable to calculate')
              }
            } else {
              setTravelTime('Unable to calculate')
            }
            setIsCalculating(false)
          }
        )
      } catch (error) {
        console.error('Error calculating travel time:', error)
        setTravelTime('Unable to calculate')
        setIsCalculating(false)
      }
    }

    calculateTravelTime()
  }, [fromLocation, toLocation, selectedTransport])

  // Fetch transit directions when transit mode is selected
  useEffect(() => {
    if (selectedTransport === 'transit' && fromLocation && toLocation) {
      setShowTransitDetails(true) // Expand by default when transit is selected
      fetchTransitDirections()
    } else {
      setTransitDirections(null)
      setShowTransitDetails(true) // Keep expanded for next time
    }
  }, [selectedTransport, fromLocation, toLocation])
  const calculateTimeGap = () => {
    if (!startTime || !endTime) return null

    const start = new Date(`2000-01-01T${startTime}`)
    const end = new Date(`2000-01-01T${endTime}`)
    
    // Handle case where end time is next day
    if (end < start) {
      end.setDate(end.getDate() + 1)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes <= 0) return null
    
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  }

  const timeGap = calculateTimeGap()
  
  // Don't show if no time gap or gap is very small (less than 30 minutes)
  if (!timeGap || !startTime || !endTime) return null
  
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  if (end < start) end.setDate(end.getDate() + 1)
  const diffMinutes = Math.floor((end.getTime() - start.getTime()) / (1000 * 60))
  
  if (diffMinutes < 30) return null

  return (
    <div className={`flex flex-col items-center my-6 ${className}`}>
      <div className="w-full max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
        {/* Time Gap Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="h-4 w-4 mr-2" />
            {isAccommodationCommute ? (
              <span className="font-medium">
                {commuteType === 'start' 
                  ? `Start day at ${endTime}` 
                  : `End day at ${startTime}`
                }
              </span>
            ) : (
              <span className="font-medium">{timeGap} gap</span>
            )}
          </div>
          
          <button
            onClick={onAddActivity}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Activity
          </button>
        </div>

        {/* Commute Information */}
        {fromLocation && toLocation && (
          <div className="border-t border-gray-200 pt-3">
            {/* Route Info */}
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[120px]" title={fromLocation}>{fromLocation}</span>
              <span className="mx-1">→</span>
              <span className="truncate max-w-[120px]" title={toLocation}>{toLocation}</span>
            </div>

            {/* Transport Options */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {transportOptions.map((option) => {
                  const IconComponent = option.icon
                  return (
                    <button
                      key={option.mode}
                      onClick={() => handleTransportClick(option.mode)}
                      className={`p-1.5 rounded-md transition-colors ${
                        selectedTransport === option.mode
                          ? 'bg-blue-100 text-blue-600'
                          : 'hover:bg-gray-200 text-gray-500'
                      }`}
                      title={option.label}
                    >
                      <IconComponent className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>

              {/* Travel Time and Directions */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-600">
                  {isCalculating ? (
                    <span className="animate-pulse">Calculating...</span>
                  ) : travelTime ? (
                    <span className="font-medium">{travelTime}</span>
                  ) : fromLocation !== toLocation ? (
                    <span className="text-gray-400">Select transport</span>
                  ) : null}
                </div>
                
                {fromLocation && toLocation && fromLocation !== toLocation && (
                  <button
                    onClick={handleGetDirections}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 transition-colors"
                    title="Get directions in Google Maps"
                  >
                    <Navigation className="h-3 w-3" />
                    <span className="hidden sm:inline">Directions</span>
                  </button>
                )}
              </div>
            </div>

            {/* Detailed Transit Directions */}
            {selectedTransport === 'transit' && transitDirections && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <button
                  onClick={() => setShowTransitDetails(!showTransitDetails)}
                  className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  <span>Transit Details ({transitDirections.totalDuration})</span>
                  {showTransitDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {showTransitDetails && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {transitDirections.steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs">
                        {step.mode === 'TRANSIT' ? (
                          <>
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                              <Bus className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-blue-600">
                                {step.transitDetails?.line} {step.transitDetails?.vehicle}
                              </div>
                              <div className="text-gray-600 text-[11px]">
                                {step.transitDetails?.departureStop} → {step.transitDetails?.arrivalStop}
                              </div>
                              {step.transitDetails?.departureTime && (
                                <div className="text-gray-500 text-[11px]">
                                  {step.transitDetails.departureTime} - {step.transitDetails.arrivalTime}
                                  {step.transitDetails.numStops && step.transitDetails.numStops > 0 && (
                                    <span className="ml-1">({step.transitDetails.numStops} stops)</span>
                                  )}
                                </div>
                              )}
                              <div className="text-gray-500 text-[11px]">{step.duration}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <PersonStanding className="h-3 w-3 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-600 text-[11px]">
                                Walk {step.distance} ({step.duration})
                              </div>
                              <div className="text-gray-500 text-[11px]">
                                {step.instructions}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading state for transit directions */}
            {selectedTransport === 'transit' && isLoadingTransit && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Bus className="h-4 w-4 animate-pulse" />
                  <span>Loading transit directions...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}