'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  Heart, 
  MapPin, 
  Star, 
  Loader2, 
  ExternalLink, 
  Trash2,
  Camera
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
  createdAt: string
}

export default function WishlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  
  const [itinerary, setItinerary] = useState<any>(null)
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchItinerary()
    fetchWishlist()
  }, [resolvedParams.id])

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
      const response = await fetch(`/api/wishlist?itineraryId=${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setWishlistItems(data.items || [])
      } else {
        console.error('Failed to fetch wishlist')
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                {item.placePhotoReference && (
                  <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                    <img
                      src={getPhotoUrl(item.placePhotoReference) || ''}
                      alt={item.placeName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
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

                  <div className="flex items-center justify-between">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}