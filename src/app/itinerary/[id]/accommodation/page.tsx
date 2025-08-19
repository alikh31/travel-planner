'use client'

import { useState, useEffect, use, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Hotel, 
  Plus, 
  MapPin, 
  Calendar,
  Clock,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react'
import TripHeader from '@/components/TripHeader'
import AddAccommodationModal from '@/components/AddAccommodationModal'
import { convertToBackendImageUrl } from '@/lib/image-utils'

interface Accommodation {
  id: string
  itineraryId?: string
  name: string
  location: string
  checkIn: string
  checkOut: string
  nights: number
  guests: number
  cost?: number
  notes?: string
  bookingRef?: string
  createdAt?: string
  updatedAt?: string
  // These fields are not in the database yet but kept for UI compatibility
  type: string
  photoUrl?: string
  amenities: string[]
  order: number
}

interface Member {
  id: string
  role: string
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface Itinerary {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  createdBy: string
  members: Member[]
  days: { id: string, date: string }[]
}

export default function AccommodationPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [accommodations, setAccommodations] = useState<Accommodation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddAccommodation, setShowAddAccommodation] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null)
  const [deletingAccommodationId, setDeletingAccommodationId] = useState<string | null>(null)
  
  const isAdmin = session?.user?.id ? 
    itinerary?.members?.some(m => m.user.id === session.user.id && m.role === 'admin') || 
    itinerary?.createdBy === session.user.id : false
  const [newAccommodation, setNewAccommodation] = useState({
    name: '',
    type: 'hotel' as 'hotel' | 'hostel' | 'apartment' | 'bnb' | 'resort' | 'other',
    location: '',
    locationPlaceId: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    photoUrl: '',
    checkIn: '',
    nights: 1,
    guests: 1,
    amenities: [] as string[],
    notes: ''
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const fetchItinerary = useCallback(async () => {
    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setItinerary(data)
        // Map accommodations with order index
        if (data.accommodations) {
          const accommodationsWithOrder = data.accommodations.map((acc: Accommodation, index: number) => ({
            ...acc,
            order: index + 1,
            type: acc.type || 'hotel',
            amenities: acc.amenities || []
          }))
          setAccommodations(accommodationsWithOrder)
        }
      } else {
        console.error('Failed to fetch itinerary')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.id])

  useEffect(() => {
    fetchItinerary()
  }, [resolvedParams.id, fetchItinerary])

  const handleAddAccommodation = () => {
    setEditingAccommodation(null)
    // Reset form for new accommodation
    setNewAccommodation({
      name: '',
      type: 'hotel',
      location: '',
      locationPlaceId: '',
      locationLat: null,
      locationLng: null,
      photoUrl: '',
      checkIn: '',
      nights: 1,
      guests: 1,
      amenities: [],
      notes: ''
    })
    setShowAddAccommodation(true)
  }

  const handleEditAccommodation = (accommodation: Accommodation) => {
    setEditingAccommodation(accommodation)
    setShowAddAccommodation(true)
  }

  const handleDeleteAccommodation = async (accommodationId: string) => {
    if (!confirm('Are you sure you want to delete this accommodation?')) return

    setDeletingAccommodationId(accommodationId)
    try {
      const response = await fetch(`/api/accommodations/${accommodationId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Refresh itinerary to get updated accommodations
        await fetchItinerary()
      } else {
        alert('Failed to delete accommodation. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting accommodation:', error)
      alert('Failed to delete accommodation')
    } finally {
      setDeletingAccommodationId(null)
    }
  }


  const handleAccommodationSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!newAccommodation.name.trim()) {
      alert('Please enter accommodation name')
      return
    }
    
    if (!newAccommodation.location.trim()) {
      alert('Please enter accommodation location')
      return
    }
    
    try {
      const checkOut = newAccommodation.checkIn ? 
        new Date(new Date(newAccommodation.checkIn).getTime() + newAccommodation.nights * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : ''
      
      if (editingAccommodation) {
        // Editing existing accommodation
        const response = await fetch(`/api/accommodations/${editingAccommodation.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAccommodation.name,
            location: newAccommodation.location,
            checkIn: newAccommodation.checkIn,
            checkOut,
            nights: newAccommodation.nights,
            guests: newAccommodation.guests,
            notes: newAccommodation.notes,
            photoUrl: newAccommodation.photoUrl
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update accommodation')
        }
      } else {
        // Adding new accommodation
        const response = await fetch('/api/accommodations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itineraryId: resolvedParams.id,
            name: newAccommodation.name,
            location: newAccommodation.location,
            checkIn: newAccommodation.checkIn,
            checkOut,
            nights: newAccommodation.nights,
            guests: newAccommodation.guests,
            notes: newAccommodation.notes,
            photoUrl: newAccommodation.photoUrl
          })
        })
        
        if (!response.ok) {
          throw new Error('Failed to add accommodation')
        }
      }
      
      // Reset the form
      setNewAccommodation({
        name: '',
        type: 'hotel',
        location: '',
        locationPlaceId: '',
        locationLat: null,
        locationLng: null,
        photoUrl: '',
        checkIn: '',
        nights: 1,
        guests: 1,
        amenities: [],
        notes: ''
      })
      
      setShowAddAccommodation(false)
      setEditingAccommodation(null)
      
      // Refresh itinerary to get updated accommodations
      await fetchItinerary()
    } catch (error) {
      console.error('Error adding accommodation:', error)
      alert('Failed to add accommodation. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-stone-gray-900 mb-2">Itinerary not found</h2>
          <Link href="/" className="text-blue-600 hover:text-blue-500">
            Return to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cloud-white">
      {/* Header */}
      <TripHeader
        itinerary={itinerary}
        session={session}
        isAdmin={isAdmin}
        currentPage="accommodation"
        backUrl={`/itinerary/${resolvedParams.id}`}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-gray-900 mb-2">Accommodation</h1>
          <p className="text-stone-gray-600">
            {itinerary.title} • {itinerary.destination}
          </p>
        </div>

        {/* Add Accommodation Section */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-stone-gray-900">Add Accommodation</h2>
              <p className="text-sm text-stone-gray-600 mt-1">
                Add hotels, Airbnb, or other places you&apos;ll be staying
              </p>
            </div>
            <button
              onClick={handleAddAccommodation}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Accommodation</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Accommodations List */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-gray-200">
          <div className="px-6 py-4 border-b border-stone-gray-200">
            <div className="flex items-center gap-2">
              <Hotel className="h-5 w-5 text-stone-gray-400" />
              <h2 className="text-lg font-semibold text-stone-gray-900">
                Your Stays ({accommodations.length})
              </h2>
            </div>
          </div>

          {accommodations.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-32 h-32 bg-golden-sand-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Hotel className="h-16 w-16 text-golden-sand-500" />
              </div>
              <h3 className="text-lg font-medium text-stone-gray-900 mb-2">No accommodation yet</h3>
              <p className="text-stone-gray-600 mb-6">
                Add your first accommodation to get started
              </p>
              <button
                onClick={handleAddAccommodation}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Accommodation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-gray-200">
              {accommodations
                .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
                .map((accommodation) => (
                  <div key={accommodation.id} className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Image Section */}
                      <div className="flex-shrink-0">
                        {accommodation.photoUrl ? (
                          <Image
                            src={convertToBackendImageUrl(accommodation.photoUrl, 300)}
                            alt={accommodation.name}
                            width={96}
                            height={96}
                            className="w-24 h-24 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              const next = e.currentTarget.nextElementSibling as HTMLElement
                              if (next) next.style.display = 'flex'
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-24 h-24 bg-golden-sand-100 rounded-lg flex items-center justify-center ${accommodation.photoUrl ? 'hidden' : 'flex'}`}
                        >
                          <Hotel className="h-8 w-8 text-golden-sand-600" />
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        <div className="sm:flex sm:items-start sm:justify-between">
                          <div className="flex-1 sm:pr-4">
                            <h3 className="text-lg font-semibold text-stone-gray-900 mb-1">
                              {accommodation.name}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-stone-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {accommodation.location}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-stone-gray-600 mb-2">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Check-in:</span>
                                {formatDate(accommodation.checkIn)}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">Check-out:</span>
                                {formatDate(accommodation.checkOut)}
                              </div>
                            </div>
                            {accommodation.notes && (
                              <p className="text-sm text-stone-gray-600 mt-2">
                                {accommodation.notes}
                              </p>
                            )}
                          </div>

                          {/* Desktop: Buttons on right */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditAccommodation(accommodation)}
                              className="flex items-center gap-1 px-3 py-1.5 text-stone-gray-600 hover:bg-stone-gray-50 rounded-lg transition-colors text-sm"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAccommodation(accommodation.id)}
                              disabled={deletingAccommodationId === accommodation.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-sunset-coral-600 hover:bg-sunset-coral-50 rounded-lg transition-colors disabled:opacity-50 text-sm"
                            >
                              {deletingAccommodationId === accommodation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile: Buttons at bottom */}
                      <div className="flex sm:hidden items-center justify-end gap-2 mt-2">
                        <button
                          onClick={() => handleEditAccommodation(accommodation)}
                          className="flex items-center gap-1 px-3 py-1.5 text-stone-gray-600 hover:bg-stone-gray-50 rounded-lg transition-colors text-sm"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccommodation(accommodation.id)}
                          disabled={deletingAccommodationId === accommodation.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-sunset-coral-600 hover:bg-sunset-coral-50 rounded-lg transition-colors disabled:opacity-50 text-sm"
                        >
                          {deletingAccommodationId === accommodation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Accommodation Modal */}
      <AddAccommodationModal
        isOpen={showAddAccommodation}
        onClose={() => {
          setShowAddAccommodation(false)
          setEditingAccommodation(null)
        }}
        newAccommodation={newAccommodation}
        setNewAccommodation={setNewAccommodation}
        onSubmit={handleAccommodationSubmit}
        itinerary={itinerary}
        accommodations={accommodations}
        editingAccommodation={editingAccommodation}
      />
    </div>
  )
}