'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  MapPin, 
  Utensils, 
  Coffee, 
  Beer, 
  Camera,
  ShoppingBag,
  TreePine,
  Landmark,
  Sparkles,
  Loader2,
  Star,
  DollarSign,
  RefreshCw
} from 'lucide-react'
import TripHeader from '@/components/TripHeader'

interface Place {
  place_id: string
  name: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  vicinity?: string
  opening_hours?: {
    open_now?: boolean
  }
  photos?: Array<{
    photo_reference: string
  }>
  geometry?: {
    location: {
      lat: number
      lng: number
    }
  }
  types?: string[]
  distance?: number
}

interface ExploreCategory {
  id: string
  name: string
  icon: any
  types: string[]
  places: Place[]
  loading: boolean
}

export default function ExplorePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  
  const [itinerary, setItinerary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gptSuggestions, setGptSuggestions] = useState<string[]>([])
  const [loadingExplore, setLoadingExplore] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  
  const [categories, setCategories] = useState<ExploreCategory[]>([
    {
      id: 'restaurants',
      name: 'Restaurants',
      icon: Utensils,
      types: ['restaurant', 'food'],
      places: [],
      loading: false
    },
    {
      id: 'cafes',
      name: 'Cafes',
      icon: Coffee,
      types: ['cafe', 'coffee_shop', 'bakery'],
      places: [],
      loading: false
    },
    {
      id: 'bars',
      name: 'Bars & Nightlife',
      icon: Beer,
      types: ['bar', 'night_club', 'pub'],
      places: [],
      loading: false
    },
    {
      id: 'attractions',
      name: 'Attractions',
      icon: Camera,
      types: ['tourist_attraction', 'museum', 'art_gallery', 'amusement_park', 'zoo', 'aquarium'],
      places: [],
      loading: false
    },
    {
      id: 'shopping',
      name: 'Shopping',
      icon: ShoppingBag,
      types: ['shopping_mall', 'store', 'market'],
      places: [],
      loading: false
    },
    {
      id: 'nature',
      name: 'Nature & Parks',
      icon: TreePine,
      types: ['park', 'natural_feature', 'hiking_area', 'campground'],
      places: [],
      loading: false
    },
    {
      id: 'culture',
      name: 'Culture & History',
      icon: Landmark,
      types: ['church', 'hindu_temple', 'mosque', 'synagogue', 'library', 'city_hall', 'monument'],
      places: [],
      loading: false
    }
  ])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchItinerary()
  }, [resolvedParams.id])

  const fetchItinerary = async () => {
    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setItinerary(data)
        // Set first day as default
        if (data.days && data.days.length > 0) {
          setSelectedDay(data.days[0].id)
        }
        // Automatically explore places when itinerary loads
        explorePlaces(data.id, data.days?.[0]?.id)
      } else {
        console.error('Failed to fetch itinerary')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    } finally {
      setLoading(false)
    }
  }

  const explorePlaces = async (itineraryId: string, dayId?: string) => {
    setLoadingExplore(true)
    setGptSuggestions([])
    
    // Reset categories
    setCategories(prev => prev.map(cat => ({ ...cat, places: [] })))
    
    try {
      const response = await fetch('/api/explore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId,
          dayId
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Set GPT suggestions
        setGptSuggestions(data.suggestions || [])
        
        // If backend couldn't search places due to API restrictions, do it on frontend
        if (data.needsClientSidePlacesSearch) {
          console.log('Backend API has restrictions, performing client-side places search')
          await searchPlacesClientSide(data.suggestions || [], data.itinerary?.destination || '')
        } else {
          // Update categories with places from backend
          setCategories(prev => prev.map(cat => ({
            ...cat,
            places: data.places?.[cat.id] || []
          })))
        }
        
      } else {
        console.error('Failed to explore places')
      }
    } catch (error) {
      console.error('Error exploring places:', error)
    } finally {
      setLoadingExplore(false)
    }
  }

  const handleDayChange = (dayId: string) => {
    setSelectedDay(dayId)
    explorePlaces(resolvedParams.id, dayId)
  }

  const handleRefreshSuggestions = () => {
    explorePlaces(resolvedParams.id, selectedDay || undefined)
  }

  const searchPlacesClientSide = async (suggestions: string[], destination: string) => {
    try {
      console.log('Searching for places client-side for:', destination)
      
      // Search for each GPT suggestion
      const allPlaces: Place[] = []
      
      for (const suggestion of suggestions) {
        try {
          const response = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `${suggestion} ${destination}`,
              maxResults: 1
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.places && data.places.length > 0) {
              allPlaces.push(...data.places)
            }
          }
        } catch (error) {
          console.error(`Error searching for ${suggestion}:`, error)
          continue
        }
      }

      // Search by category for general places
      const categorySearches = [
        { query: `restaurants in ${destination}`, types: ['restaurant', 'food'] },
        { query: `cafes in ${destination}`, types: ['cafe', 'coffee_shop'] },
        { query: `bars in ${destination}`, types: ['bar', 'pub'] },
        { query: `attractions in ${destination}`, types: ['tourist_attraction', 'museum'] },
        { query: `shopping in ${destination}`, types: ['shopping_mall', 'store'] },
        { query: `parks in ${destination}`, types: ['park'] },
        { query: `temples in ${destination}`, types: ['church', 'temple'] }
      ]

      for (const categorySearch of categorySearches) {
        try {
          const response = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: categorySearch.query,
              maxResults: 3
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.places && data.places.length > 0) {
              allPlaces.push(...data.places)
            }
          }
        } catch (error) {
          console.error(`Error searching for ${categorySearch.query}:`, error)
          continue
        }
      }

      // Remove duplicates
      const uniquePlaces = allPlaces.reduce((acc: Place[], place) => {
        if (!acc.find(p => p.place_id === place.place_id)) {
          acc.push(place)
        }
        return acc
      }, [])

      console.log('Found', uniquePlaces.length, 'unique places client-side')

      // Categorize places
      setCategories(prev => prev.map(cat => ({
        ...cat,
        places: uniquePlaces.filter(place => 
          place.types?.some(type => cat.types.includes(type)) || false
        )
      })))

    } catch (error) {
      console.error('Error in client-side places search:', error)
    }
  }

  const getAllPlaces = () => {
    const allPlaces = new Map<string, Place>()
    categories.forEach(cat => {
      cat.places.forEach(place => {
        allPlaces.set(place.place_id, place)
      })
    })
    return Array.from(allPlaces.values())
  }

  const getPhotoUrl = (photoReference?: string) => {
    if (!photoReference) return null
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
  }

  const renderPriceLevel = (level?: number) => {
    if (!level) return null
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(4)].map((_, i) => (
          <DollarSign 
            key={i}
            className={`h-3 w-3 ${i < level ? 'text-green-600' : 'text-gray-300'}`}
          />
        ))}
      </div>
    )
  }

  const PlaceCard = ({ place }: { place: Place }) => (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
      {place.photos && place.photos[0] && getPhotoUrl(place.photos[0].photo_reference) && (
        <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          <img
            src={getPhotoUrl(place.photos[0].photo_reference) || ''}
            alt={place.name}
            className="w-full h-full object-cover"
          />
          {place.opening_hours && (
            <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
              place.opening_hours.open_now 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {place.opening_hours.open_now ? 'Open Now' : 'Closed'}
            </div>
          )}
        </div>
      )}
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{place.name}</h3>
        
        <div className="flex items-center gap-3 mb-2">
          {place.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{place.rating}</span>
              {place.user_ratings_total && (
                <span className="text-sm text-gray-500">({place.user_ratings_total})</span>
              )}
            </div>
          )}
          {renderPriceLevel(place.price_level)}
        </div>
        
        {place.vicinity && (
          <div className="flex items-start gap-1 text-sm text-gray-600">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{place.vicinity}</span>
          </div>
        )}
      </div>
    </div>
  )

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

  const displayPlaces = selectedCategory === 'all' 
    ? getAllPlaces() 
    : categories.find(cat => cat.id === selectedCategory)?.places || []

  const isAdmin = session?.user?.id ? 
    itinerary?.members?.some((m: any) => m.user.id === session.user.id && m.role === 'admin') || 
    itinerary?.createdBy === session.user.id : false

  return (
    <div className="min-h-screen bg-cloud-white">
      <TripHeader 
        itinerary={itinerary} 
        session={session} 
        isAdmin={isAdmin}
        currentPage="explore" 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Day Selection & AI Suggestions Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sunset-coral-600" />
              <h2 className="text-lg font-semibold">AI Recommendations for {itinerary.destination}</h2>
            </div>
            <button
              onClick={handleRefreshSuggestions}
              disabled={loadingExplore}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingExplore ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Day Selection */}
          {itinerary?.days && itinerary.days.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Explore places for specific day (optional):
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setSelectedDay(null)
                    explorePlaces(resolvedParams.id)
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedDay === null
                      ? 'bg-sunset-coral-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Days
                </button>
                {itinerary.days.map((day: any, index: number) => (
                  <button
                    key={day.id}
                    onClick={() => handleDayChange(day.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedDay === day.id
                        ? 'bg-sunset-coral-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Day {index + 1} ({new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {loadingExplore ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-sunset-coral-600" />
              <span className="ml-2 text-gray-600">Getting personalized recommendations...</span>
            </div>
          ) : gptSuggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {gptSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="px-3 py-1.5 bg-sunset-coral-50 text-sunset-coral-700 rounded-full text-sm font-medium"
                >
                  {suggestion}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Loading AI-powered recommendations...
            </p>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-sunset-coral-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MapPin className="h-4 w-4" />
            All Places
          </button>
          
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-sunset-coral-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {category.name}
                {category.places.length > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    selectedCategory === category.id
                      ? 'bg-white/20'
                      : 'bg-gray-100'
                  }`}>
                    {category.places.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Places Grid */}
        {categories.find(cat => cat.id === selectedCategory)?.loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-sunset-coral-600" />
            <span className="ml-2 text-gray-600">Searching for places...</span>
          </div>
        ) : displayPlaces.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayPlaces.map(place => (
              <PlaceCard key={place.place_id} place={place} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {selectedCategory === 'all' 
                ? 'Get AI suggestions to discover places'
                : `No ${categories.find(cat => cat.id === selectedCategory)?.name.toLowerCase()} found yet`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}