'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X } from 'lucide-react'

interface PlaceResult {
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

interface LocationSearchProps {
  value: string
  onChange: (location: string, placeData?: PlaceResult) => void
  placeholder?: string
  className?: string
}

export default function LocationSearch({ 
  value, 
  onChange, 
  placeholder = "Search for a location...",
  className = ""
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [googleMaps, setGoogleMaps] = useState<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Google Maps once
  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        const { loadGoogleMaps } = await import('../lib/googleMaps')
        const google = await loadGoogleMaps()
        setGoogleMaps(google)
      } catch (error) {
        console.error('Failed to load Google Maps:', error)
      }
    }

    initGoogleMaps()
  }, [])

  // Update search query when value changes
  useEffect(() => {
    setSearchQuery(value)
  }, [value])

  const searchPlaces = async (query: string) => {
    if (!query.trim() || !googleMaps) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const service = new googleMaps.maps.places.PlacesService(document.createElement('div'))
      
      service.textSearch(
        {
          query,
          type: 'establishment',
        },
        (results: any[], status: any) => {
          if (status === googleMaps.maps.places.PlacesServiceStatus.OK && results) {
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
            setSuggestions(places)
            setSelectedIndex(-1) // Reset selection when new results arrive
          } else {
            setSuggestions([])
            setSelectedIndex(-1)
          }
          setLoading(false)
        }
      )
    } catch (error) {
      console.error('Error searching places:', error)
      setSuggestions([])
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)
    onChange(newValue)
    setSelectedIndex(-1) // Reset selection when typing
    
    if (newValue.trim()) {
      setIsOpen(true)
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      
      // Debounce search
      timeoutRef.current = setTimeout(() => {
        searchPlaces(newValue)
      }, 300)
    } else {
      setIsOpen(false)
      setSuggestions([])
    }
  }

  const handleSelectPlace = (place: PlaceResult) => {
    setSearchQuery(place.formatted_address)
    onChange(place.formatted_address, place)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
  }

  const handleClear = () => {
    setSearchQuery('')
    onChange('')
    setIsOpen(false)
    setSuggestions([])
  }

  const handleFocus = () => {
    if (searchQuery.trim() && suggestions.length === 0 && googleMaps) {
      setIsOpen(true)
      searchPlaces(searchQuery)
    }
  }

  const handleBlur = () => {
    // Delay closing to allow click on suggestions
    setTimeout(() => {
      setIsOpen(false)
      setSelectedIndex(-1)
    }, 150)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectPlace(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={googleMaps ? placeholder : "Loading..."}
          disabled={!googleMaps}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center">
              <Search className="h-4 w-4 mr-2 animate-spin" />
              Searching...
            </div>
          )}
          
          {!loading && suggestions.length === 0 && searchQuery.trim() && (
            <div className="px-4 py-3 text-sm text-gray-500">
              No locations found
            </div>
          )}
          
          {!loading && suggestions.map((place, index) => (
            <button
              key={place.place_id || index}
              onClick={() => handleSelectPlace(place)}
              className={`w-full px-4 py-3 text-left flex items-start space-x-3 border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                index === selectedIndex ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${
                  index === selectedIndex ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {place.name}
                </div>
                <div className={`text-sm truncate ${
                  index === selectedIndex ? 'text-blue-700' : 'text-gray-500'
                }`}>
                  {place.formatted_address}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}