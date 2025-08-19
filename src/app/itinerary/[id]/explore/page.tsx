'use client'

import { useState, useEffect, use, useCallback, useMemo, memo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useActivityTracking } from '@/hooks/useActivityTracking'
import { 
  MapPin, 
  Camera,
  Sparkles,
  Loader2,
  Star,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Heart,
  ExternalLink,
  Clock
} from 'lucide-react'

// Move ImmersivePlaceCard completely outside to preserve animations
const ImmersivePlaceCard = memo(({ 
  place, 
  isNext = false, 
  placeIndex,
  currentPlaceIndex,
  currentImageIndex,
  isImageScrolling,
  enhancedPlaces,
  loadingEnhancedPlace,
  placeImageIndexes,
  onNavigateToImage,
  wishlistItems,
  onToggleWishlist
}: { 
  place: any
  isNext?: boolean
  placeIndex?: number
  currentPlaceIndex: number
  currentImageIndex: number
  isImageScrolling: boolean
  enhancedPlaces: Map<string, any>
  loadingEnhancedPlace: string | null
  placeImageIndexes: Map<string, number>
  onNavigateToImage: (index: number) => void
  wishlistItems: Set<string>
  onToggleWishlist: (place: any) => void
}) => {
  // Get enhanced place data
  const enhanced = enhancedPlaces.get(place.place_id)
  const enhancedPlace = enhanced ? {
    ...place,
    photos: enhanced.photos && enhanced.photos.length > 0 ? enhanced.photos : place.photos,
    editorial_summary: enhanced.editorial_summary,
    reviews: enhanced.reviews
  } : place

  const photos = enhancedPlace.photos || []
  const hasPhotos = photos.length > 0
  const isCurrentPlace = placeIndex === currentPlaceIndex
  const isLoading = loadingEnhancedPlace === place.place_id
  
  // Get the stored image index for this place, or use current if it's the current place
  const placeSpecificImageIndex = isCurrentPlace 
    ? currentImageIndex 
    : (placeImageIndexes.get(place.place_id) || 0)

  const isInWishlist = wishlistItems.has(place.place_id)

  const handleDoubleClick = () => {
    onToggleWishlist(enhancedPlace)
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

  return (
    <div className={`relative w-full transition-all duration-300 ${
      isNext 
        ? 'h-20 md:h-32 opacity-70 transform scale-95' 
        : 'h-screen min-h-screen'
    }`}
    style={!isNext ? { height: '100vh', minHeight: '100dvh' } : {}}>
      {/* Image Carousel Container */}
      {hasPhotos ? (
        <div className="absolute inset-0 overflow-hidden">
          {/* Direct inline carousel for animation stability */}
          <div 
            className="flex h-full transition-transform duration-[350ms] ease-out"
            style={{
              width: `${photos.length * 100}%`,
              transform: `translateX(-${placeSpecificImageIndex * (100 / photos.length)}%)`,
              pointerEvents: isImageScrolling && isCurrentPlace ? 'none' : 'auto'
            }}
            onDoubleClick={handleDoubleClick}
          >
            {photos.map((photo: any, index: number) => {
              // Generate stable image key
              const imageKey = `${enhancedPlace.place_id}-${index}`
              
              // Determine photo reference
              const photoReference = photo.name || photo.photo_reference
              const isNewAPIPhotoName = photoReference?.startsWith('places/') && photoReference?.includes('/photos/')
              
              // Use backend API for images
              const imageUrl = photoReference 
                ? `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=1600${isNewAPIPhotoName ? '' : '&legacy=true'}`
                : null
              
              return (
                <div
                  key={imageKey}
                  className="w-full h-full flex-shrink-0"
                  style={{ width: `${100 / photos.length}%` }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${enhancedPlace.name} - Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading={index === placeSpecificImageIndex ? "eager" : "lazy"}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sunset-coral-500 to-sunset-coral-700 flex items-center justify-center">
                      <Camera className="h-20 w-20 text-white opacity-50" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-sunset-coral-500 to-sunset-coral-700" onDoubleClick={handleDoubleClick}>
          <div className="flex items-center justify-center h-full">
            <Camera className="h-20 w-20 text-white opacity-50" />
          </div>
        </div>
      )}

      {!isNext && (
        <>
          {/* Image Navigation Dots */}
          {photos.length > 1 && isCurrentPlace && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
              {photos.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation()
                    onNavigateToImage(index)
                  }}
                  className={`w-3 h-3 rounded-full transition-all cursor-pointer shadow-md ${
                    index === placeSpecificImageIndex 
                      ? 'bg-white border border-white scale-110' 
                      : 'bg-gray-400 bg-opacity-60 border border-gray-300 hover:bg-gray-300'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Image Navigation Arrows */}
          {photos.length > 1 && isCurrentPlace && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigateToImage(currentImageIndex - 1)
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigateToImage(currentImageIndex + 1)
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
            <div className="max-w-2xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{enhancedPlace.name}</h2>
              
              <div className="flex items-center gap-4 mb-3">
                {enhancedPlace.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="font-medium">{enhancedPlace.rating}</span>
                    {enhancedPlace.user_ratings_total && (
                      <span className="opacity-75">({enhancedPlace.user_ratings_total})</span>
                    )}
                  </div>
                )}
                {renderPriceLevel(enhancedPlace.price_level)}
                {enhancedPlace.opening_hours && (
                  <div className={`px-2 py-1 rounded text-sm font-medium ${
                    enhancedPlace.opening_hours.open_now 
                      ? 'bg-green-500 text-white' 
                      : 'bg-red-500 text-white'
                  }`}>
                    <Clock className="h-3 w-3 inline mr-1" />
                    {enhancedPlace.opening_hours.open_now ? 'Open' : 'Closed'}
                  </div>
                )}
                {isLoading && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-black bg-opacity-40 rounded text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading details...
                  </div>
                )}
              </div>

              {enhancedPlace.vicinity && (
                <div className="flex items-start gap-2 mb-4 opacity-90">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{enhancedPlace.vicinity}</span>
                </div>
              )}

              {/* Place Summary */}
              {enhancedPlace.editorial_summary && (
                <div className="mb-4 opacity-90">
                  <p className="text-sm leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    {enhancedPlace.editorial_summary}
                  </p>
                </div>
              )}

              {/* Top Review */}
              {enhancedPlace.reviews && enhancedPlace.reviews.length > 0 && (
                <div className="opacity-85">
                  <p className="text-xs italic leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                    &ldquo;{enhancedPlace.reviews[0].text.length > 120 
                      ? enhancedPlace.reviews[0].text.substring(0, 120) + '...' 
                      : enhancedPlace.reviews[0].text}&rdquo;
                  </p>
                  <p className="text-xs mt-1 opacity-75">
                    — {enhancedPlace.reviews[0].author_name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onToggleWishlist(enhancedPlace)
              }}
              className={`p-3 rounded-full transition-all border border-white border-opacity-20 ${
                isInWishlist 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-black bg-opacity-40 backdrop-blur-sm text-white hover:bg-opacity-60'
              }`}
              title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-current' : 'stroke-current'}`} />
            </button>
            <button 
              onClick={() => {
                // Open Google Maps with the place
                const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${enhancedPlace.place_id}`
                window.open(googleMapsUrl, '_blank', 'noopener,noreferrer')
              }}
              className="bg-black bg-opacity-40 backdrop-blur-sm text-white p-3 rounded-full hover:bg-opacity-60 transition-all border border-white border-opacity-20"
              title="Open in Google Maps"
            >
              <ExternalLink className="h-6 w-6 stroke-current" />
            </button>
          </div>

        </>
      )}
    </div>
  )
})

ImmersivePlaceCard.displayName = 'ImmersivePlaceCard'



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
    name?: string
  }>
  geometry?: {
    location: {
      lat: number
      lng: number
    }
  }
  types?: string[]
  distance?: number
  editorial_summary?: string
  reviews?: Array<{
    text: string
    rating: number
    author_name: string
  }>
}


export default function ExplorePage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  
  
  
  const [itinerary, setItinerary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [gptSuggestions, setGptSuggestions] = useState<string[]>([])
  const [loadingExplore, setLoadingExplore] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [currentPlaceIndex, setCurrentPlaceIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [placeImageIndexes, setPlaceImageIndexes] = useState<Map<string, number>>(new Map())
  const [isScrolling, setIsScrolling] = useState(false)
  const [isImageScrolling, setIsImageScrolling] = useState(false)
  const [enhancedPlaces, setEnhancedPlaces] = useState<Map<string, any>>(new Map())
  const [loadingEnhancedPlace, setLoadingEnhancedPlace] = useState<string | null>(null)
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [imageUrlCache] = useState<Map<string, string>>(new Map())
  const [wishlistItems, setWishlistItems] = useState<Set<string>>(new Set())
  const [sessionId] = useState(() => `explore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [placeMetadata, setPlaceMetadata] = useState<Map<string, any>>(new Map())
  
  const [categories, setCategories] = useState<any[]>([])

  // Initialize activity tracking
  const { startPlaceView, endPlaceView, trackImageSlide, trackWishlistAdd } = useActivityTracking({
    itineraryId: resolvedParams.id,
    sessionId,
    dayId: selectedDay || undefined
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchItinerary()
    fetchWishlist()
  }, [resolvedParams.id])

  const getAllPlaces = useCallback(() => {
    const allPlaces = new Map<string, Place>()
    categories.forEach((cat: any) => {
      if (cat.places) {
        cat.places.forEach((place: Place) => {
          allPlaces.set(place.place_id, place)
        })
      }
    })
    return Array.from(allPlaces.values())
  }, [categories])
  
  // Get all places for immersive view
  const allDisplayPlaces = useMemo(() => {
    return getAllPlaces()
  }, [getAllPlaces])

  // Fetch enhanced details for a specific place on-demand
  const fetchEnhancedDetails = useCallback(async (placeId: string) => {
    // Skip if already enhanced or currently loading
    if (enhancedPlaces.has(placeId) || loadingEnhancedPlace === placeId) {
      return
    }

    setLoadingEnhancedPlace(placeId)
    
    try {
      const response = await fetch('/api/place-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setEnhancedPlaces(prev => new Map(prev).set(placeId, result.data))
        }
      } else {
        console.error('Failed to fetch enhanced details for place:', placeId)
      }
    } catch (error) {
      console.error('Error fetching enhanced details:', error)
    } finally {
      setLoadingEnhancedPlace(null)
    }
  }, [enhancedPlaces, loadingEnhancedPlace])

  // Enhanced place data retrieval
  const getEnhancedPlace = useCallback((place: Place) => {
    const enhanced = enhancedPlaces.get(place.place_id)
    if (enhanced) {
      return {
        ...place,
        photos: enhanced.photos && enhanced.photos.length > 0 ? enhanced.photos : place.photos,
        editorial_summary: enhanced.editorial_summary,
        reviews: enhanced.reviews
      }
    }
    return place
  }, [enhancedPlaces])

  // Fetch enhanced details when place changes
  useEffect(() => {
    if (allDisplayPlaces.length > 0) {
      const currentPlace = allDisplayPlaces[currentPlaceIndex]
      if (currentPlace) {
        fetchEnhancedDetails(currentPlace.place_id)
        
        // Pre-fetch next place for smoother experience
        const nextPlace = allDisplayPlaces[currentPlaceIndex + 1]
        if (nextPlace) {
          setTimeout(() => fetchEnhancedDetails(nextPlace.place_id), 1000)
        }
      }
    }
  }, [currentPlaceIndex, allDisplayPlaces, fetchEnhancedDetails])

  const navigateToPlace = useCallback((newIndex: number) => {
    if (allDisplayPlaces.length === 0 || isScrolling) return
    
    // Handle bounds
    let targetIndex = newIndex
    if (newIndex < 0) {
      targetIndex = 0
    } else if (newIndex >= allDisplayPlaces.length) {
      targetIndex = allDisplayPlaces.length - 1
    }
    
    // Don't navigate if already at target
    if (targetIndex === currentPlaceIndex) return
    
    setIsScrolling(true)
    
    // Scroll to the target place with smooth animation
    const scrollContainer = document.querySelector('.immersive-scroll-container')
    if (scrollContainer) {
      const targetScrollTop = targetIndex * window.innerHeight
      scrollContainer.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      })
      
      // Wait for scroll animation to complete
      setTimeout(() => {
        setCurrentPlaceIndex(targetIndex)
        
        // Sync currentImageIndex with the stored index for the new place
        const newPlace = allDisplayPlaces[targetIndex]
        if (newPlace) {
          const storedIndex = placeImageIndexes.get(newPlace.place_id) || 0
          setCurrentImageIndex(storedIndex)
          
          // Start tracking new place view
          startPlaceView(newPlace.place_id, newPlace.name, targetIndex)
        } else {
          setCurrentImageIndex(0)
        }
        
        setIsScrolling(false)
      }, 560) // 30% faster than 800ms (800 * 0.7 = 560ms)
    } else {
      setCurrentPlaceIndex(targetIndex)
      
      // Sync currentImageIndex with the stored index for the new place
      const newPlace = allDisplayPlaces[targetIndex]
      if (newPlace) {
        const storedIndex = placeImageIndexes.get(newPlace.place_id) || 0
        setCurrentImageIndex(storedIndex)
        
        // Start tracking new place view with metadata
        const metadata = placeMetadata.get(newPlace.place_id)
        startPlaceView(newPlace.place_id, newPlace.name, targetIndex, metadata)
      } else {
        setCurrentImageIndex(0)
      }
      
      setIsScrolling(false)
    }
  }, [allDisplayPlaces, currentPlaceIndex, isScrolling, placeImageIndexes, startPlaceView])

  const navigateToImage = useCallback((newIndex: number) => {
    const currentPlace = allDisplayPlaces[currentPlaceIndex]
    if (!currentPlace?.photos || currentPlace.photos.length === 0 || isImageScrolling) return
    
    // Handle wraparound navigation
    let targetIndex = newIndex
    if (newIndex < 0) {
      targetIndex = currentPlace.photos.length - 1
    } else if (newIndex >= currentPlace.photos.length) {
      targetIndex = 0
    }
    
    // Don't navigate if already at target
    if (targetIndex === currentImageIndex) return
    
    setIsImageScrolling(true)
    
    // Update state
    setCurrentImageIndex(targetIndex)
    setPlaceImageIndexes(prev => {
      const newMap = new Map(prev)
      newMap.set(currentPlace.place_id, targetIndex)
      return newMap
    })
    
    // Track image slide
    trackImageSlide()
    
    // Clear animation lock after a short delay
    setTimeout(() => {
      setIsImageScrolling(false)
    }, 350) // Match new CSS animation duration (30% faster)
  }, [allDisplayPlaces, currentPlaceIndex, currentImageIndex, isImageScrolling, trackImageSlide])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [currentPlaceIndex, currentImageIndex, navigateToPlace, navigateToImage])

  // Custom scroll management - one place at a time with smooth animation
  
  // Disable browser gestures globally
  useEffect(() => {
      // Apply the most effective solution from Flutter issue #152588
      // This completely disables horizontal overscroll behavior
      const originalStyles = {
        htmlOverscrollBehaviorX: document.documentElement.style.overscrollBehaviorX,
        bodyOverscrollBehaviorX: document.body.style.overscrollBehaviorX,
        htmlTouchAction: document.documentElement.style.touchAction,
        bodyTouchAction: document.body.style.touchAction,
      }
      
      // Set CSS properties as recommended in the Flutter issue
      document.documentElement.style.overscrollBehaviorX = 'none'
      document.body.style.overscrollBehaviorX = 'none'
      document.documentElement.style.touchAction = 'pan-y pinch-zoom'
      document.body.style.touchAction = 'pan-y pinch-zoom'
      
      // Prevent keyboard navigation
      const preventKeyNavigation = (e: KeyboardEvent) => {
        if (
          e.key === 'Backspace' || 
          (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
          (e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))
        ) {
          const target = e.target as HTMLElement
          if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
      
      document.addEventListener('keydown', preventKeyNavigation, { capture: true })
      
      return () => {
        // Restore original styles
        document.documentElement.style.overscrollBehaviorX = originalStyles.htmlOverscrollBehaviorX
        document.body.style.overscrollBehaviorX = originalStyles.bodyOverscrollBehaviorX
        document.documentElement.style.touchAction = originalStyles.htmlTouchAction
        document.body.style.touchAction = originalStyles.bodyTouchAction
        
        document.removeEventListener('keydown', preventKeyNavigation, { capture: true })
      }
  }, [])
  
  useEffect(() => {
    const scrollContainer = document.querySelector('.immersive-scroll-container') as HTMLElement
    if (!scrollContainer) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      // Prevent scrolling during animation
      if (isScrolling || isImageScrolling) return
      
      // Check if this is a horizontal scroll (for image navigation)
      const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      
      if (isHorizontalScroll) {
        // Handle horizontal scroll for image navigation
        if (Math.abs(e.deltaX) < 50) return
        
        const direction = e.deltaX > 0 ? 1 : -1
        const targetImageIndex = currentImageIndex + direction
        
        navigateToImage(targetImageIndex)
      } else {
        // Handle vertical scroll for place navigation
        if (Math.abs(e.deltaY) < 50) return
        
        const direction = e.deltaY > 0 ? 1 : -1
        const targetIndex = currentPlaceIndex + direction
        
        // Check bounds
        if (targetIndex < 0 || targetIndex >= allDisplayPlaces.length) return
        
        // Navigate to the target place
        navigateToPlace(targetIndex)
      }
    }

    // Add horizontal scroll event handling for image containers
    const handleImageScroll = (e: WheelEvent) => {
      const target = e.target as HTMLElement
      const imageContainer = target.closest('.image-scroll-container')
      
      if (imageContainer && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Let the horizontal scroll happen naturally for image navigation
        // The scrollTo in navigateToImage will handle smooth scrolling
        return
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (isScrolling || isImageScrolling) return
      const touch = e.touches[0]
      scrollContainer.dataset.touchStartX = touch.clientX.toString()
      scrollContainer.dataset.touchStartY = touch.clientY.toString()
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Let the global handler prevent default, we just need to track movement
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrolling || isImageScrolling) return
      
      const touch = e.changedTouches[0]
      const startX = parseFloat(scrollContainer.dataset.touchStartX || '0')
      const startY = parseFloat(scrollContainer.dataset.touchStartY || '0')
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      
      // Determine if this is primarily horizontal or vertical movement
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
      
      if (isHorizontalSwipe) {
        // Handle horizontal swipe for image navigation
        if (Math.abs(deltaX) < 50) return // Reduced threshold for more responsive
        
        const direction = deltaX < 0 ? 1 : -1 // Swipe left = next image
        const targetImageIndex = currentImageIndex + direction
        
        navigateToImage(targetImageIndex)
      } else {
        // Handle vertical swipe for place navigation
        if (Math.abs(deltaY) < 100) return
        
        const direction = deltaY < 0 ? 1 : -1
        const targetIndex = currentPlaceIndex + direction
        
        // Check bounds
        if (targetIndex < 0 || targetIndex >= allDisplayPlaces.length) return
        
        navigateToPlace(targetIndex)
      }
    }

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false })
    scrollContainer.addEventListener('touchstart', handleTouchStart, { passive: false })
    scrollContainer.addEventListener('touchmove', handleTouchMove, { passive: false })
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel)
      scrollContainer.removeEventListener('touchstart', handleTouchStart)
      scrollContainer.removeEventListener('touchmove', handleTouchMove)
      scrollContainer.removeEventListener('touchend', handleTouchEnd)
    }
  }, [currentPlaceIndex, currentImageIndex, allDisplayPlaces.length, isScrolling, isImageScrolling, navigateToPlace, navigateToImage])


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

  const fetchWishlist = async () => {
    try {
      const response = await fetch(`/api/wishlist?itineraryId=${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        const placeIds = new Set<string>(data.items.map((item: any) => item.placeId))
        setWishlistItems(placeIds)
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error)
    }
  }

  const toggleWishlist = async (place: Place) => {
    const isInWishlist = wishlistItems.has(place.place_id)
    
    try {
      if (isInWishlist) {
        // Remove from wishlist
        const response = await fetch(`/api/wishlist?placeId=${place.place_id}&itineraryId=${resolvedParams.id}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          setWishlistItems(prev => {
            const newSet = new Set(prev)
            newSet.delete(place.place_id)
            return newSet
          })
        }
      } else {
        // Add to wishlist
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeId: place.place_id,
            placeName: place.name,
            placeVicinity: place.vicinity,
            placeRating: place.rating,
            placePhotoReference: place.photos?.[0]?.photo_reference || place.photos?.[0]?.name,
            itineraryId: resolvedParams.id
          })
        })
        
        if (response.ok) {
          setWishlistItems(prev => new Set(prev).add(place.place_id))
          // Track wishlist addition
          trackWishlistAdd(place.place_id)
        }
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error)
    }
  }

  const explorePlaces = async (itineraryId: string, dayId?: string) => {
    setLoadingExplore(true)
    setGptSuggestions([])
    
    // Reset categories
    setCategories([])
    
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
        
        // Store place metadata
        if (data.placeMetadata) {
          const metadataMap = new Map<string, any>()
          Object.keys(data.placeMetadata).forEach(placeId => {
            metadataMap.set(placeId, data.placeMetadata[placeId])
          })
          setPlaceMetadata(metadataMap)
        }
        
        // Update categories with places - convert to simple format for immersive view
        const newCategories: any[] = []
        if (data.places) {
          Object.keys(data.places).forEach(categoryId => {
            newCategories.push({
              id: categoryId,
              places: data.places[categoryId] || []
            })
          })
        }
        setCategories(newCategories)
        
        // Reset place index when new places are loaded
        setCurrentPlaceIndex(0)
        setCurrentImageIndex(0)
        
        // Clear enhanced places cache when new places are loaded
        setEnhancedPlaces(new Map())
        
        // Start tracking first place if available
        const firstPlace = newCategories.length > 0 && newCategories[0].places && newCategories[0].places.length > 0
          ? newCategories[0].places[0]
          : null
        if (firstPlace) {
          const metadata = data.placeMetadata?.[firstPlace.place_id]
          setTimeout(() => {
            startPlaceView(firstPlace.place_id, firstPlace.name, 0, metadata)
          }, 100) // Small delay to ensure state is updated
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

  const getPhotoUrl = useCallback((photoReference?: string) => {
    if (!photoReference) {
      console.log('No photo reference provided')
      return null
    }
    
    // Check cache first
    if (imageUrlCache.has(photoReference)) {
      return imageUrlCache.get(photoReference)
    }
    
    // Determine if this is a new Places API photo name or legacy photo reference
    const isNewAPIPhotoName = photoReference.startsWith('places/') && photoReference.includes('/photos/')
    
    // Use backend API for images - it handles caching and both legacy/new formats
    const url = `/api/images?name=${encodeURIComponent(photoReference)}&maxWidth=1600${isNewAPIPhotoName ? '' : '&legacy=true'}`
    
    // Cache the URL
    imageUrlCache.set(photoReference, url)
    
    return url
  }, [imageUrlCache])

  const handleImageLoad = useCallback((imageKey: string) => {
    setLoadedImages(prev => new Set(prev).add(imageKey))
  }, [])

  const isImageLoaded = useCallback((imageKey: string) => {
    return loadedImages.has(imageKey)
  }, [loadedImages])

  const renderPriceLevel = useCallback((level?: number) => {
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
  }, [])



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

  // allDisplayPlaces and displayPlaces now defined above with useMemo

  // Immersive full-screen view - this is the only view for explore
  return (
    <div 
      className="min-h-screen bg-black overflow-hidden"
      style={{ 
        height: '100vh',
        minHeight: '100dvh',
        touchAction: 'none', 
        overscrollBehavior: 'none',
        paddingLeft: 'calc(100vw - 100%)'
      }}
    >
      {/* Header - only visible on desktop or when not in full screen */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black via-black/50 to-transparent p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/itinerary/${resolvedParams.id}`)}
              className="bg-black bg-opacity-60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm hover:bg-opacity-70 transition-all border border-white/20"
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              ← Overview
            </button>
            <h1 className="text-lg font-semibold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{itinerary.destination}</h1>
          </div>
          <button
            onClick={handleRefreshSuggestions}
            disabled={loadingExplore}
            className="bg-black bg-opacity-60 backdrop-blur-sm p-2 rounded-lg hover:bg-opacity-70 transition-all border border-white/20"
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

      {/* Immersive Place Cards - Custom Scroll Container */}
      {!loadingExplore && allDisplayPlaces.length > 0 && (
        <div 
          className="immersive-scroll-container h-screen overflow-y-scroll z-10 scrollbar-hide"
          style={{ 
            height: '100vh',
            minHeight: '100dvh',
            overscrollBehavior: 'none',
            touchAction: 'pan-y'
          }}
        >
          {allDisplayPlaces.map((place, index) => {
            // Only render current place and adjacent places for performance
            // This prevents loading images for all places at once
            const shouldRender = index >= currentPlaceIndex - 1 && index <= currentPlaceIndex + 1
            
            return (
              <div 
                key={place.place_id} 
                className="immersive-place-card flex-shrink-0"
              >
                {shouldRender ? (
                  <ImmersivePlaceCard 
                    key={place.place_id} 
                    place={place} 
                    isNext={false} 
                    placeIndex={index}
                    currentPlaceIndex={currentPlaceIndex}
                    currentImageIndex={currentImageIndex}
                    isImageScrolling={isImageScrolling}
                    enhancedPlaces={enhancedPlaces}
                    loadingEnhancedPlace={loadingEnhancedPlace}
                    placeImageIndexes={placeImageIndexes}
                    onNavigateToImage={navigateToImage}
                    wishlistItems={wishlistItems}
                    onToggleWishlist={toggleWishlist}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-white opacity-50">
                      <Camera className="h-20 w-20" />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Progress Indicator - Fixed Position */}
      {!loadingExplore && allDisplayPlaces.length > 0 && (
        <div className="absolute top-20 right-4 z-30">
          <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm border border-white/20" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
            {currentPlaceIndex + 1} / {allDisplayPlaces.length}
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