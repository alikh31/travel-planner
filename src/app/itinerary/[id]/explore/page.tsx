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
  RefreshCw,
  Gamepad2,
  Waves,
  Palette,
  Film,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Heart,
  Share,
  ExternalLink,
  Clock
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
  const [showAllPlaces, setShowAllPlaces] = useState(false)
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'grid' | 'tiktok'>('tiktok')
  const [isSwipeMode, setIsSwipeMode] = useState(false)
  
  const [categories, setCategories] = useState<ExploreCategory[]>([
    {
      id: 'restaurants',
      name: 'Restaurants',
      icon: Utensils,
      types: ['restaurant', 'food', 'meal_takeaway'],
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
      types: ['tourist_attraction', 'museum', 'amusement_park', 'zoo', 'aquarium'],
      places: [],
      loading: false
    },
    {
      id: 'arts',
      name: 'Arts & Culture',
      icon: Palette,
      types: ['art_gallery', 'library', 'theater'],
      places: [],
      loading: false
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: Film,
      types: ['movie_theater', 'bowling_alley', 'casino'],
      places: [],
      loading: false
    },
    {
      id: 'wellness',
      name: 'Health & Wellness',
      icon: Waves,
      types: ['spa', 'gym', 'beauty_salon'],
      places: [],
      loading: false
    },
    {
      id: 'shopping',
      name: 'Shopping',
      icon: ShoppingBag,
      types: ['shopping_mall', 'store', 'market', 'clothing_store'],
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
      name: 'Religious & Historic',
      icon: Landmark,
      types: ['church', 'hindu_temple', 'mosque', 'synagogue', 'city_hall', 'monument'],
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'tiktok') return
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          navigateToPlace(currentPlaceIndex - 1)
          break
        case 'ArrowDown':
          e.preventDefault()
          navigateToPlace(currentPlaceIndex + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          navigateToImage(currentImageIndex - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          navigateToImage(currentImageIndex + 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [viewMode, currentPlaceIndex, currentImageIndex])

  // Touch/swipe handling
  useEffect(() => {
    let startY = 0
    let startX = 0
    let currentY = 0
    let currentX = 0

    const handleTouchStart = (e: TouchEvent) => {
      if (viewMode !== 'tiktok') return
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (viewMode !== 'tiktok') return
      currentY = e.touches[0].clientY
      currentX = e.touches[0].clientX
    }

    const handleTouchEnd = () => {
      if (viewMode !== 'tiktok') return
      
      const diffY = startY - currentY
      const diffX = startX - currentX
      
      // Determine if it's a vertical or horizontal swipe
      if (Math.abs(diffY) > Math.abs(diffX)) {
        // Vertical swipe
        if (Math.abs(diffY) > 50) {
          if (diffY > 0) {
            // Swipe up - next place
            navigateToPlace(currentPlaceIndex + 1)
          } else {
            // Swipe down - previous place
            navigateToPlace(currentPlaceIndex - 1)
          }
        }
      } else {
        // Horizontal swipe
        if (Math.abs(diffX) > 50) {
          if (diffX > 0) {
            // Swipe left - next image
            navigateToImage(currentImageIndex + 1)
          } else {
            // Swipe right - previous image
            navigateToImage(currentImageIndex - 1)
          }
        }
      }
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [viewMode, currentPlaceIndex, currentImageIndex])

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
        
        // Update categories with places
        setCategories(prev => prev.map(cat => ({
          ...cat,
          places: data.places?.[cat.id] || []
        })))
        
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

  const navigateToPlace = (newIndex: number) => {
    const allPlaces = getAllPlaces()
    if (newIndex >= 0 && newIndex < allPlaces.length) {
      setCurrentPlaceIndex(newIndex)
      setCurrentImageIndex(0) // Reset image index when changing place
    }
  }

  const navigateToImage = (newIndex: number) => {
    const allPlaces = getAllPlaces()
    const currentPlace = allPlaces[currentPlaceIndex]
    if (!currentPlace?.photos) return
    
    const maxIndex = currentPlace.photos.length - 1
    if (newIndex >= 0 && newIndex <= maxIndex) {
      setCurrentImageIndex(newIndex)
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

  const TikTokPlaceCard = ({ place, isNext = false }: { place: Place, isNext?: boolean }) => {
    const photos = place.photos || []
    const hasPhotos = photos.length > 0
    const currentPhoto = photos[currentImageIndex] || photos[0]
    
    return (
      <div className={`relative w-full transition-all duration-300 ${
        isNext 
          ? 'h-20 md:h-32 opacity-70 transform scale-95' 
          : 'h-screen md:h-[calc(100vh-120px)]'
      }`}>
        {/* Background Image */}
        {hasPhotos && currentPhoto ? (
          <div className="absolute inset-0 bg-black">
            <img
              src={getPhotoUrl(currentPhoto.photo_reference) || ''}
              alt={place.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-30" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sunset-coral-500 to-sunset-coral-700">
            <div className="flex items-center justify-center h-full">
              <Camera className="h-20 w-20 text-white opacity-50" />
            </div>
          </div>
        )}

        {!isNext && (
          <>
            {/* Image Navigation Dots */}
            {photos.length > 1 && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
                {photos.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex ? 'bg-white' : 'bg-white opacity-50'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Image Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => navigateToImage(currentImageIndex - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => navigateToImage(currentImageIndex + 1)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
              <div className="max-w-md">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">{place.name}</h2>
                
                <div className="flex items-center gap-4 mb-3">
                  {place.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="font-medium">{place.rating}</span>
                      {place.user_ratings_total && (
                        <span className="opacity-75">({place.user_ratings_total})</span>
                      )}
                    </div>
                  )}
                  {renderPriceLevel(place.price_level)}
                  {place.opening_hours && (
                    <div className={`px-2 py-1 rounded text-sm font-medium ${
                      place.opening_hours.open_now 
                        ? 'bg-green-500 text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {place.opening_hours.open_now ? 'Open' : 'Closed'}
                    </div>
                  )}
                </div>

                {place.vicinity && (
                  <div className="flex items-start gap-2 mb-4 opacity-90">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{place.vicinity}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
              <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all">
                <Heart className="h-6 w-6" />
              </button>
              <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all">
                <Share className="h-6 w-6" />
              </button>
              <button className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all">
                <ExternalLink className="h-6 w-6" />
              </button>
            </div>

            {/* Navigation Hints */}
            <div className="absolute left-1/2 bottom-4 transform -translate-x-1/2 text-white text-center opacity-70 z-10">
              <div className="hidden md:block text-sm">
                <p>← → Navigate images • ↑ ↓ Next place</p>
              </div>
              <div className="md:hidden text-sm">
                <p>Swipe to explore</p>
              </div>
            </div>
          </>
        )}
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

  const allDisplayPlaces = selectedCategory === 'all' 
    ? getAllPlaces() 
    : categories.find(cat => cat.id === selectedCategory)?.places || []
  
  const displayPlaces = showAllPlaces ? allDisplayPlaces : allDisplayPlaces.slice(0, 12)

  const isAdmin = session?.user?.id ? 
    itinerary?.members?.some((m: any) => m.user.id === session.user.id && m.role === 'admin') || 
    itinerary?.createdBy === session.user.id : false

  if (viewMode === 'grid') {
    return (
      <div className="min-h-screen bg-cloud-white">
        <TripHeader 
          itinerary={itinerary} 
          session={session} 
          isAdmin={isAdmin}
          currentPage="explore" 
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* View Mode Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setViewMode('tiktok')}
              className="flex items-center gap-2 px-4 py-2 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
            >
              <Film className="h-4 w-4" />
              TikTok View
            </button>
          </div>

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
              onClick={() => {
                setSelectedCategory('all')
                setShowAllPlaces(false)
              }}
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
                  onClick={() => {
                    setSelectedCategory(category.id)
                    setShowAllPlaces(false)
                  }}
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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {displayPlaces.map(place => (
                  <PlaceCard key={place.place_id} place={place} />
                ))}
              </div>
              
              {/* Show More Button */}
              {allDisplayPlaces.length > 12 && (
                <div className="text-center mt-8">
                  {!showAllPlaces ? (
                    <button
                      onClick={() => setShowAllPlaces(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
                    >
                      Show More Places ({allDisplayPlaces.length - 12} more)
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAllPlaces(false)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Show Less
                    </button>
                  )}
                </div>
              )}
            </>
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

  // TikTok-style view
  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Header - only visible on desktop or when not in full screen */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('grid')}
              className="bg-white bg-opacity-20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm hover:bg-opacity-30 transition-all"
            >
              ← Grid View
            </button>
            <h1 className="text-lg font-semibold">{itinerary.destination}</h1>
          </div>
          <button
            onClick={handleRefreshSuggestions}
            disabled={loadingExplore}
            className="bg-white bg-opacity-20 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-30 transition-all"
          >
            <RefreshCw className={`h-5 w-5 ${loadingExplore ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loadingExplore && (
        <div className="flex items-center justify-center h-screen text-white">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
            <p>Finding amazing places...</p>
          </div>
        </div>
      )}

      {/* TikTok-style Place Cards */}
      {!loadingExplore && allDisplayPlaces.length > 0 && (
        <div className="relative h-screen">
          {/* Current Place */}
          <TikTokPlaceCard place={allDisplayPlaces[currentPlaceIndex]} />
          
          {/* Next Place Peek (Desktop only) */}
          {allDisplayPlaces[currentPlaceIndex + 1] && (
            <div className="hidden md:block absolute bottom-0 left-0 right-0">
              <TikTokPlaceCard place={allDisplayPlaces[currentPlaceIndex + 1]} isNext={true} />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="flex flex-col gap-4">
              <button
                onClick={() => navigateToPlace(currentPlaceIndex - 1)}
                className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all opacity-0 hover:opacity-100"
                disabled={currentPlaceIndex === 0}
              >
                <ChevronUp className="h-6 w-6" />
              </button>
              <button
                onClick={() => navigateToPlace(currentPlaceIndex + 1)}
                className="bg-white bg-opacity-20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-30 transition-all opacity-0 hover:opacity-100"
                disabled={currentPlaceIndex === allDisplayPlaces.length - 1}
              >
                <ChevronDown className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="absolute top-20 right-4 z-20">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm">
              {currentPlaceIndex + 1} / {allDisplayPlaces.length}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingExplore && allDisplayPlaces.length === 0 && (
        <div className="flex items-center justify-center h-screen text-white text-center">
          <div>
            <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No places found</h2>
            <p className="opacity-75 mb-6">Try refreshing or changing your filters</p>
            <button
              onClick={handleRefreshSuggestions}
              className="bg-sunset-coral-600 text-white px-6 py-3 rounded-lg hover:bg-sunset-coral-700 transition-colors"
            >
              Refresh Suggestions
            </button>
          </div>
        </div>
      )}
    </div>
  )
}