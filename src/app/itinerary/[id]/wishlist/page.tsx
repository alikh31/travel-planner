'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { getDayDate } from '@/lib/date-utils'
import { useRouter } from 'next/navigation'
import { 
  Heart, 
  MapPin, 
  Star, 
  Loader2, 
  ExternalLink, 
  Trash2,
  Camera,
  Plus,
  Clock,
  X,
  Calendar,
  Minus
} from 'lucide-react'
import TripHeader from '@/components/TripHeader'

interface WishlistItem {
  id: string
  placeId: string
  placeName: string
  placeVicinity?: string
  placeRating?: number
  placePhotoReference?: string
  itineraryId: string
  gptTimeframe?: string
  gptDuration?: number
  locationLat?: number
  locationLng?: number
  createdAt: string
  isInItinerary?: boolean // Track if already added to itinerary
}

export default function WishlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  
  const [itinerary, setItinerary] = useState<any>(null)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set())
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false)
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<WishlistItem | null>(null)
  const [customTime, setCustomTime] = useState('')
  const [customDuration, setCustomDuration] = useState('')
  const [customDayIndex, setCustomDayIndex] = useState<number | null>(null)
  const [suggestedTimeSlot, setSuggestedTimeSlot] = useState<{dayIndex: number, startTime: string, endTime: string} | null>(null)
  const [timeAutoSuggested, setTimeAutoSuggested] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchItinerary()
  }, [resolvedParams.id])

  useEffect(() => {
    if (itinerary) {
      fetchWishlist()
    }
  }, [itinerary])

  const fetchItinerary = async () => {
    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setItinerary(data)
      } else {
        console.error('Failed to fetch itinerary')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    }
  }

  const fetchWishlist = async () => {
    try {
      // Fetch wishlist items
      const wishlistResponse = await fetch(`/api/wishlist?itineraryId=${resolvedParams.id}`)
      if (!wishlistResponse.ok) {
        console.error('Failed to fetch wishlist')
        return
      }
      
      const wishlistData = await wishlistResponse.json()
      const wishlistItems = wishlistData.items || []
      
      // Fetch itinerary activities to check which places are already added
      if (itinerary?.days) {
        const activitiesInItinerary = itinerary.days.flatMap((day: any) => 
          day.activities?.map((activity: any) => activity.locationPlaceId).filter(Boolean) || []
        )
        
        // Mark wishlist items that are already in the itinerary
        const updatedWishlistItems = wishlistItems.map((item: WishlistItem) => ({
          ...item,
          isInItinerary: activitiesInItinerary.includes(item.placeId)
        }))
        
        setWishlistItems(updatedWishlistItems)
      } else {
        setWishlistItems(wishlistItems)
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromWishlist = async (placeId: string) => {
    setDeletingItems(prev => new Set(prev).add(placeId))
    
    try {
      const response = await fetch(`/api/wishlist?placeId=${placeId}&itineraryId=${resolvedParams.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setWishlistItems(prev => prev.filter(item => item.placeId !== placeId))
      } else {
        console.error('Failed to remove from wishlist')
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error)
    } finally {
      setDeletingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(placeId)
        return newSet
      })
    }
  }

  const getPhotoUrl = (photoReference?: string) => {
    if (!photoReference) return null
    
    // Determine if this is a new Places API photo name or legacy photo reference
    const isNewAPIPhotoName = photoReference.startsWith('places/') && photoReference.includes('/photos/')
    
    // Use backend API for images
    return `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=400${isNewAPIPhotoName ? '' : '&legacy=true'}`
  }

  const openInGoogleMaps = (placeId: string) => {
    const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
  }

  const addToItinerary = async (item: WishlistItem) => {
    setSelectedWishlistItem(item)
    
    // Get existing activities for time slot calculation
    const existingActivities: any[] = []
    if (itinerary?.days) {
      itinerary.days.forEach((day: any) => {
        day.activities?.forEach((activity: any) => {
          if (activity.startTime && activity.duration) {
            existingActivities.push({
              startTime: activity.startTime,
              duration: activity.duration,
              dayIndex: activity.dayIndex || 0
            })
          }
        })
      })
    }

    // Try to find a suggested time slot
    try {
      const response = await fetch('/api/wishlist/find-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gptTimeframe: item.gptTimeframe || 'anytime',
          gptDuration: item.gptDuration || 60,
          existingActivities,
          days: itinerary?.days?.map((day: any, index: number) => ({
            dayIndex: day.dayIndex || index,
            date: getDayDate(itinerary.startDate, day.dayIndex || index)
          })) || []
        })
      })

      const result = await response.json()
      if (response.ok && result.timeSlot) {
        setSuggestedTimeSlot(result.timeSlot)
        setCustomDayIndex(result.timeSlot.dayIndex)
        setCustomTime(result.timeSlot.startTime)
      } else {
        // No suggested slot found, use defaults but still prefill day
        setSuggestedTimeSlot(null)
        setCustomDayIndex(0) // Default to first day
        const timeframe = item.gptTimeframe || 'anytime'
        setCustomTime(timeframe === 'morning' ? '09:00' : 
                     timeframe === 'afternoon' ? '14:00' :
                     timeframe === 'evening' ? '18:00' :
                     timeframe === 'night' ? '20:00' : '12:00')
      }
    } catch (error) {
      console.error('Error finding time slot:', error)
      // Fall back to defaults but still prefill day
      setSuggestedTimeSlot(null)
      setCustomDayIndex(0) // Default to first day
      const timeframe = item.gptTimeframe || 'anytime'
      setCustomTime(timeframe === 'morning' ? '09:00' : 
                   timeframe === 'afternoon' ? '14:00' :
                   timeframe === 'evening' ? '18:00' :
                   timeframe === 'night' ? '20:00' : '12:00')
    }

    setCustomDuration((item.gptDuration || 60).toString())
    setShowTimeSlotModal(true)
  }

  const removeFromItinerary = async (item: WishlistItem) => {
    setRemovingItems(prev => new Set(prev).add(item.id))
    
    try {
      // Find the activity in the itinerary that matches this place
      let activityToRemove = null
      if (itinerary?.days) {
        for (const day of itinerary.days) {
          const activity = day.activities?.find((act: any) => act.locationPlaceId === item.placeId)
          if (activity) {
            activityToRemove = activity
            break
          }
        }
      }

      if (!activityToRemove) {
        alert('Could not find the activity in your itinerary')
        return
      }

      const response = await fetch(`/api/activities/${activityToRemove.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Refresh the itinerary to update the isInItinerary status
        await fetchItinerary()
      } else {
        const result = await response.json()
        alert(`Error: ${result.error || 'Failed to remove from itinerary'}`)
      }
    } catch (error) {
      console.error('Error removing from itinerary:', error)
      alert('Failed to remove from itinerary. Please try again.')
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(item.id)
        return newSet
      })
    }
  }


  // Function to calculate best available time for a specific day
  const calculateBestTimeForDay = async (dayIndex: number, item: WishlistItem) => {
    if (!itinerary) return

    // Get activities for the selected day
    const existingActivities: any[] = []
    
    if (itinerary.days && itinerary.days[dayIndex]) {
      const selectedDay = itinerary.days[dayIndex]
      selectedDay.activities?.forEach((activity: any) => {
        if (activity.startTime && activity.duration) {
          existingActivities.push({
            startTime: activity.startTime,
            duration: activity.duration,
            dayIndex: dayIndex
          })
        }
      })
    }

    try {
      // Try to find a time slot for this specific day
      const response = await fetch('/api/wishlist/find-time-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gptTimeframe: item.gptTimeframe || 'anytime',
          gptDuration: item.gptDuration || 60,
          existingActivities,
          days: [{
            dayIndex: dayIndex,
            date: getDayDate(itinerary.startDate, dayIndex)
          }],
          preferredDayIndex: dayIndex // Force it to find a slot on this specific day
        })
      })

      const result = await response.json()
      if (response.ok && result.timeSlot && result.timeSlot.dayIndex === dayIndex) {
        return result.timeSlot.startTime
      } else {
        // If no optimal slot found, suggest based on timeframe and existing activities
        return suggestTimeBasedOnActivities(existingActivities, item.gptTimeframe || 'anytime')
      }
    } catch (error) {
      console.error('Error calculating time for day:', error)
      return suggestTimeBasedOnActivities(existingActivities, item.gptTimeframe || 'anytime')
    }
  }

  // Helper function to suggest time based on existing activities and timeframe
  const suggestTimeBasedOnActivities = (activities: any[], timeframe?: string) => {
    // Default times by timeframe
    const defaultTimes = {
      morning: '09:00',
      afternoon: '14:00', 
      evening: '18:00',
      night: '20:00'
    }
    
    const defaultTime = defaultTimes[timeframe as keyof typeof defaultTimes] || '12:00'
    
    // If no activities, return default time
    if (activities.length === 0) {
      return defaultTime
    }
    
    // Sort activities by start time
    const sortedActivities = activities
      .filter(a => a.startTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
    
    // Try to find a gap that fits the timeframe
    if (timeframe === 'morning') {
      // For morning, try before first activity or early morning
      const firstActivity = sortedActivities[0]
      if (firstActivity && firstActivity.startTime > '09:00') {
        return '09:00'
      }
      return '08:00' // Very early if first activity is before 9am
    }
    
    if (timeframe === 'evening') {
      // For evening, try after last activity
      const lastActivity = sortedActivities[sortedActivities.length - 1]
      if (lastActivity) {
        const endTime = calculateEndTime(lastActivity.startTime, lastActivity.duration)
        if (endTime && endTime < '18:00') {
          return '18:00'
        }
        // Suggest 1 hour after last activity ends
        const [hours, minutes] = endTime.split(':').map(Number)
        const newTime = new Date()
        newTime.setHours(hours, minutes)
        newTime.setTime(newTime.getTime() + 60 * 60 * 1000) // Add 1 hour
        return newTime.toTimeString().slice(0, 5)
      }
      return '18:00'
    }
    
    // For afternoon/night or anytime, find largest gap or use default
    return defaultTime
  }

  // Helper to calculate end time
  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const start = new Date()
    start.setHours(hours, minutes)
    const end = new Date(start.getTime() + duration * 60 * 1000)
    return end.toTimeString().slice(0, 5)
  }

  const addToItineraryWithCustomSlot = async () => {
    if (!selectedWishlistItem || customDayIndex === null) return
    
    setAddingItems(prev => new Set(prev).add(selectedWishlistItem.id))
    
    try {
      const response = await fetch('/api/wishlist/add-to-itinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wishlistItemId: selectedWishlistItem.id,
          itineraryId: resolvedParams.id,
          customDayIndex: customDayIndex,
          customStartTime: customTime,
          customDuration: parseInt(customDuration) || 60
        })
      })

      const result = await response.json()

      if (response.ok) {
        setShowTimeSlotModal(false)
        setSelectedWishlistItem(null)
        // Refresh the itinerary and wishlist to update the isInItinerary status
        await fetchItinerary()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Error adding to itinerary:', error)
      alert('Failed to add to itinerary. Please try again.')
    } finally {
      setAddingItems(prev => {
        const newSet = new Set(prev)
        if (selectedWishlistItem) {
          newSet.delete(selectedWishlistItem.id)
        }
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sunset-coral-600" />
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <p className="text-gray-600">Itinerary not found</p>
      </div>
    )
  }

  const isAdmin = session?.user?.id ? 
    itinerary?.members?.some((m: any) => m.user.id === session.user.id && m.role === 'admin') || 
    itinerary?.createdBy === session.user.id : false

  // Group wishlist items by city
  const groupedWishlistItems = wishlistItems.reduce((groups: { [key: string]: WishlistItem[] }, item) => {
    // Extract city from placeVicinity (which contains formattedAddress from Google Places API)
    let city = 'Other'
    
    if (item.placeVicinity) {
      // Google Places formattedAddress typically follows patterns like:
      // "123 Main St, San Francisco, CA 94102, USA"
      // "Eiffel Tower, 5 Avenue Anatole France, 75007 Paris, France"
      // "1-chōme-18-31 Gotenyama, Musashino, Tokyo 180-0005, Japan"
      
      const parts = item.placeVicinity.split(',').map(p => p.trim())
      
      // Known major cities to prioritize
      const majorCities = [
        'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya', 'Sapporo', 'Kobe', 'Fukuoka',
        'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 
        'San Diego', 'Dallas', 'San Jose', 'Austin', 'San Francisco', 'Seattle', 'Denver', 'Boston',
        'London', 'Paris', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Barcelona', 'Munich', 'Milan',
        'Vienna', 'Prague', 'Budapest', 'Warsaw', 'Dublin', 'Copenhagen', 'Stockholm', 'Oslo',
        'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland', 'Toronto', 'Vancouver', 'Montreal',
        'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hong Kong', 'Singapore', 'Seoul', 'Bangkok',
        'Mumbai', 'Delhi', 'Bangalore', 'Dubai', 'Cairo', 'Istanbul', 'Moscow', 'São Paulo', 'Rio de Janeiro',
        'Buenos Aires', 'Mexico City', 'Lima', 'Bogotá', 'Santiago', 'Caracas'
      ]
      
      // First, check if any part matches a known major city
      for (const part of parts) {
        const cleanPart = part.replace(/\s*\d{3}-\d{4}/, '').trim() // Remove Japanese postal codes
        for (const knownCity of majorCities) {
          if (cleanPart.toLowerCase().includes(knownCity.toLowerCase())) {
            city = knownCity
            break
          }
        }
        if (city !== 'Other') break
      }
      
      // If no major city found, use heuristics
      if (city === 'Other') {
        // Remove parts that are definitely not cities
        const filteredParts = parts.filter(part => {
          // Skip if it's a country name
          const lowerPart = part.toLowerCase()
          const countries = ['usa', 'united states', 'uk', 'united kingdom', 'japan', 'france',
            'germany', 'italy', 'spain', 'canada', 'australia', 'mexico', 'brazil', 'argentina',
            'india', 'china', 'south korea', 'thailand', 'indonesia', 'philippines', 'vietnam',
            'netherlands', 'belgium', 'switzerland', 'austria', 'sweden', 'norway', 'denmark',
            'finland', 'poland', 'czech republic', 'hungary', 'greece', 'portugal', 'ireland']
          if (countries.includes(lowerPart)) {
            return false
          }
          
          // Skip if it's just a postal/zip code
          if (/^\d{3}-\d{4}$/.test(part) || // Japanese postal code
              /^\d{5,6}(-\d{4})?$/.test(part) || // US ZIP code
              /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/.test(part) || // Canadian postal code
              /^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/.test(part)) { // UK postcode
            return false
          }
          
          // Skip if it's a US state abbreviation
          if (/^[A-Z]{2}$/.test(part) && part.length === 2) {
            return false
          }
          
          // Skip if it contains "Prefecture" or similar administrative terms
          if (part.includes('Prefecture') || part.includes('Province') || part.includes('County')) {
            return false
          }
          
          return true
        })
        
        // For Japanese addresses: often formatted as "district, city postal-code"
        // The city is typically the part before the postal code
        if (parts.some(p => /^\d{3}-\d{4}/.test(p))) {
          // Find the part just before the postal code
          for (let i = 0; i < parts.length; i++) {
            if (/^\d{3}-\d{4}/.test(parts[i]) && i > 0) {
              city = parts[i - 1].trim()
              break
            }
          }
        }
        
        // If still no city found, use general heuristics
        if (city === 'Other' && filteredParts.length > 0) {
          if (filteredParts.length === 1) {
            city = filteredParts[0]
          } else if (filteredParts.length === 2) {
            // Usually "landmark/street, city"
            city = filteredParts[1]
          } else {
            // For multi-part addresses, city is often second-to-last
            city = filteredParts[filteredParts.length - 2] || filteredParts[filteredParts.length - 1]
          }
        }
      }
      
      // Clean up city name
      city = city.replace(/\s*\d{3}-\d{4}/, '') // Remove Japanese postal codes if attached
              .replace(/ City$/, '') // Remove "City" suffix
              .replace(/^(Ward|District|Borough) of /, '') // Remove prefixes
              .trim()
      
      // Final validation
      if (!city || city.length === 0 || /^\d/.test(city)) {
        city = 'Other'
      }
    }
    
    if (!groups[city]) {
      groups[city] = []
    }
    groups[city].push(item)
    return groups
  }, {})

  // Sort cities alphabetically, with "Other" at the end
  const sortedCities = Object.keys(groupedWishlistItems).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="min-h-screen bg-cloud-white">
      <TripHeader 
        itinerary={itinerary} 
        session={session} 
        isAdmin={isAdmin}
        currentPage="wishlist" 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-sunset-coral-600" />
            <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'place' : 'places'}
            </span>
          </div>
          <button
            onClick={() => router.push(`/itinerary/${resolvedParams.id}/explore`)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Explore Places
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No places in your wishlist yet</h2>
            <p className="text-gray-500 mb-6">
              Explore places and double-click or click the heart icon to add them to your wishlist
            </p>
            <button
              onClick={() => router.push(`/itinerary/${resolvedParams.id}/explore`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
            >
              <Camera className="h-5 w-5" />
              Start Exploring
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedCities.map((city) => (
              <div key={city}>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-sunset-coral-600" />
                  <h2 className="text-xl font-semibold text-gray-900">{city}</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    {groupedWishlistItems[city].length} {groupedWishlistItems[city].length === 1 ? 'place' : 'places'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groupedWishlistItems[city].map((item) => (
              <div key={item.id} className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 ${
                item.isInItinerary ? 'bg-gray-50' : ''
              }`}>
                {item.placePhotoReference && (
                  <div className={`relative h-48 bg-gray-200 rounded-t-lg overflow-hidden ${
                    item.isInItinerary ? 'opacity-60' : ''
                  }`}>
                    <img
                      src={getPhotoUrl(item.placePhotoReference) || ''}
                      alt={item.placeName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  {/* Content with conditional opacity */}
                  <div className={item.isInItinerary ? 'opacity-60' : ''}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{item.placeName}</h3>
                      <button
                        onClick={() => removeFromWishlist(item.placeId)}
                        disabled={deletingItems.has(item.placeId)}
                        className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove from wishlist"
                      >
                        {deletingItems.has(item.placeId) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    
                    {item.placeRating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{item.placeRating}</span>
                      </div>
                    )}
                    
                    {item.placeVicinity && (
                      <div className="flex items-start gap-1 text-sm text-gray-600 mb-3">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{item.placeVicinity}</span>
                      </div>
                    )}

                    {/* GPT Suggestions Display */}
                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-3 bg-blue-50 px-2 py-1 rounded">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="capitalize">{item.gptTimeframe || 'anytime'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.gptDuration || 60}min</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-400">
                        Added {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => openInGoogleMaps(item.placeId)}
                        className="flex items-center gap-1 text-sm text-sunset-coral-600 hover:text-sunset-coral-700 transition-colors"
                        title="Open in Google Maps"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </button>
                    </div>
                  </div>

                  {/* Add/Remove Itinerary Buttons - Outside opacity effect */}
                  <div className="mb-0">
                    {item.isInItinerary ? (
                      <div className="space-y-2">
                        <div className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-400 text-white text-sm font-medium rounded-lg opacity-60">
                          <Calendar className="h-4 w-4" />
                          In Itinerary
                        </div>
                        <button
                          onClick={() => removeFromItinerary(item)}
                          disabled={removingItems.has(item.id)}
                          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          {removingItems.has(item.id) ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3" />
                              Remove from Itinerary
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToItinerary(item)}
                        disabled={addingItems.has(item.id)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {addingItems.has(item.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4" />
                            Add to Itinerary
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time Slot Selection Modal */}
      {showTimeSlotModal && selectedWishlistItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schedule &quot;{selectedWishlistItem.placeName}&quot;</h3>
              <button
                onClick={() => {
                  setShowTimeSlotModal(false)
                  setSelectedWishlistItem(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Day Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <select
                  value={customDayIndex !== null ? customDayIndex.toString() : ''}
                  onChange={async (e) => {
                    const newDayIndex = e.target.value ? parseInt(e.target.value) : null
                    setCustomDayIndex(newDayIndex)
                    
                    // Calculate new suggested time for the selected day
                    if (newDayIndex !== null && selectedWishlistItem) {
                      const suggestedTime = await calculateBestTimeForDay(newDayIndex, selectedWishlistItem)
                      if (suggestedTime) {
                        setCustomTime(suggestedTime)
                        setTimeAutoSuggested(true)
                        // Clear the auto-suggested flag after a few seconds
                        setTimeout(() => setTimeAutoSuggested(false), 3000)
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sunset-coral-600"
                  required
                >
                  <option value="">Select a day...</option>
                  {itinerary?.days?.map((day: any, index: number) => (
                    <option key={day.id} value={index}>
                      Day {index + 1} - {getDayDate(itinerary.startDate, day.dayIndex || index).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value)
                    setTimeAutoSuggested(false) // Clear flag when user manually changes time
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sunset-coral-600"
                  required
                />
                {timeAutoSuggested && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Time updated based on day&apos;s availability</span>
                  </div>
                )}
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  min="15"
                  max="480"
                  step="15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sunset-coral-600"
                  required
                />
              </div>

              {/* Suggested Time Slot Display */}
              {suggestedTimeSlot && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-800">✨ Suggested Time Slot:</p>
                    <button
                      onClick={() => {
                        setCustomDayIndex(suggestedTimeSlot.dayIndex)
                        setCustomTime(suggestedTimeSlot.startTime)
                        setCustomDuration((selectedWishlistItem?.gptDuration || 60).toString())
                      }}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
                    >
                      Use This
                    </button>
                  </div>
                  <div className="text-sm text-green-700">
                    Day {suggestedTimeSlot.dayIndex + 1} • {suggestedTimeSlot.startTime} - {suggestedTimeSlot.endTime}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Based on your itinerary and our recommendations</p>
                </div>
              )}

            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTimeSlotModal(false)
                  setSelectedWishlistItem(null)
                }}
                className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addToItineraryWithCustomSlot}
                disabled={!customTime || !customDuration || customDayIndex === null || addingItems.has(selectedWishlistItem.id)}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
              >
                {addingItems.has(selectedWishlistItem.id) ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding...
                  </div>
                ) : (
                  'Add to Itinerary'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}