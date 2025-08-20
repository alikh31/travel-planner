'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { PlusCircle, MapPin, Users, Calendar, MoreVertical, Edit3, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import UserMenu from '@/components/UserMenu'
import TravelCardImages from '@/components/TravelCardImages'

interface Itinerary {
  id: string
  title: string
  description?: string
  destination: string
  startDate: string
  endDate: string
  createdBy: string
  members: Array<{
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
    role: string
  }>
  days: Array<{
    id: string
    date: string
    activities: Array<{
      id: string
      title: string
      startTime?: string
      duration?: number
      location?: string
      locationPlaceId?: string
      locationLat?: number
      locationLng?: number
    }>
  }>
}

export default function Home() {
  const { data: session, status } = useSession()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchItineraries()
    }
  }, [session])

  // Polling effect to refresh itineraries every 10 seconds
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      fetchItineraries()
    }, 10000) // Poll every 10 seconds for home page (less frequent)

    return () => clearInterval(interval)
  }, [session])

  const fetchItineraries = async () => {
    try {
      const response = await fetch('/api/itineraries')
      if (response.ok) {
        const data = await response.json()
        setItineraries(data)
      }
    } catch (error) {
      console.error('Error fetching itineraries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditItinerary = async (updatedData: Partial<Itinerary>) => {
    if (!editingItinerary) return

    try {
      const response = await fetch(`/api/itineraries/${editingItinerary.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (response.ok) {
        await fetchItineraries()
        setEditingItinerary(null)
      } else {
        console.error('Failed to update itinerary')
      }
    } catch (error) {
      console.error('Error updating itinerary:', error)
    }
  }

  const handleDeleteItinerary = async (itineraryId: string) => {
    try {
      const response = await fetch(`/api/itineraries/${itineraryId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchItineraries()
        setShowDeleteConfirm(null)
      } else {
        console.error('Failed to delete itinerary')
      }
    } catch (error) {
      console.error('Error deleting itinerary:', error)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-dropdown]')) {
        setOpenDropdown(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600 mx-auto"></div>
          <p className="mt-4 text-stone-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-blue-50 to-sky-aqua-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-8">
            <MapPin className="mx-auto h-16 w-16 text-ocean-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-stone-gray-900 mb-2">Travel Planner</h1>
            <p className="text-stone-gray-600">Plan your perfect trip together</p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center text-sm text-stone-gray-600">
              <Users className="h-5 w-5 mr-2 text-forest-green-500" />
              Collaborate with friends and family
            </div>
            <div className="flex items-center text-sm text-stone-gray-600">
              <Calendar className="h-5 w-5 mr-2 text-golden-sand-500" />
              Plan day-by-day itineraries
            </div>
            <div className="flex items-center text-sm text-stone-gray-600">
              <PlusCircle className="h-5 w-5 mr-2 text-sky-aqua-500" />
              Vote on activities and suggestions
            </div>
          </div>

          <button
            onClick={() => signIn('google')}
            className="w-full bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cloud-white">
      <header className="sticky top-0 z-40 bg-white shadow-sm overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-ocean-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-stone-gray-900">Travel Planner</h1>
            </div>
            
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-stone-gray-900">Travels</h2>
            
            <Link
              href="/itinerary/new"
              className="inline-flex items-center px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white font-medium rounded-lg transition-colors"
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              New Itinerary
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading itineraries...</p>
          </div>
        ) : (
          <>
            {itineraries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No travels yet</h3>
                <p className="text-gray-600 mb-4">Create your first travel plan to get started</p>
                <Link
                  href="/itinerary/new"
                  className="inline-flex items-center px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white font-medium rounded-lg transition-colors"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Create Travel
                </Link>
              </div>
            ) : (
              (() => {
                // Sort itineraries by start date (latest first)
                const sortedItineraries = [...itineraries].sort((a, b) => 
                  new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                )

                // Group by year
                const groupedByYear = sortedItineraries.reduce((groups, itinerary) => {
                  const year = new Date(itinerary.startDate).getFullYear().toString()
                  if (!groups[year]) {
                    groups[year] = []
                  }
                  groups[year].push(itinerary)
                  return groups
                }, {} as Record<string, typeof itineraries>)

                // Get years sorted by latest first
                const years = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a))

                return years.map(year => (
                  <div key={year} className="mb-8">
                    <h3 className="text-2xl font-light text-stone-gray-400 mb-6">
                      {year}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupedByYear[year].map((itinerary) => {
                        const totalActivities = itinerary.days.reduce(
                          (total, day) => total + day.activities.length,
                          0
                        )
                        
                        // Collect all activities for the image component
                        const allActivities: Array<{title: string, startTime?: string, locationPlaceId?: string}> = []
                        for (const day of itinerary.days) {
                          for (const activity of day.activities) {
                            allActivities.push({
                              title: activity.title,
                              startTime: activity.startTime,
                              locationPlaceId: activity.locationPlaceId
                            })
                          }
                        }
                        
                        // Get first 3 activities for display (if needed for future use)
                        // const displayActivities = allActivities.slice(0, 3)
                        
                        const isCreator = session?.user?.id === itinerary.createdBy
                        
                        return (
                          <div
                            key={itinerary.id}
                            className="bg-white rounded-lg shadow-sm border border-stone-gray-200 overflow-hidden hover:shadow-md transition-shadow group relative"
                          >
                            {/* Image Section - Clickable */}
                            <Link href={`/itinerary/${itinerary.id}`}>
                              <TravelCardImages 
                                activities={allActivities}
                                destination={itinerary.destination}
                                itineraryId={itinerary.id}
                                totalActivities={totalActivities}
                              />
                            </Link>
                            
                            {/* Content Section */}
                            <div className="p-6">
                              <div className="mb-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <Link href={`/itinerary/${itinerary.id}`}>
                                      <h4 className="text-lg font-semibold text-stone-gray-900 mb-1 hover:text-ocean-blue-600 transition-colors">
                                        {itinerary.title}
                                      </h4>
                                    </Link>
                                    <div className="flex items-center text-sm text-stone-gray-600 mb-2">
                                      <MapPin className="h-4 w-4 mr-1" />
                                      {itinerary.destination}
                                    </div>
                                    <div className="flex items-center text-sm text-stone-gray-600">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {format(new Date(itinerary.startDate), 'MMM d')} - {format(new Date(itinerary.endDate), 'MMM d, yyyy')}
                                    </div>
                                  </div>
                                  
                                  {/* Dropdown Menu - Only for creators */}
                                  {isCreator && (
                                    <div className="relative flex-shrink-0 ml-2" data-dropdown>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setOpenDropdown(openDropdown === itinerary.id ? null : itinerary.id)
                                        }}
                                        className="p-2 text-stone-gray-400 hover:text-stone-gray-600 hover:bg-stone-gray-50 rounded-lg transition-colors"
                                        title="Trip options"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>
                                      
                                      {/* Dropdown Menu */}
                                      {openDropdown === itinerary.id && (
                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-stone-gray-200 py-1 z-10">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setEditingItinerary(itinerary)
                                              setOpenDropdown(null)
                                            }}
                                            className="w-full flex items-center px-3 py-2 text-sm text-stone-gray-700 hover:bg-stone-gray-50 transition-colors"
                                          >
                                            <Edit3 className="h-4 w-4 mr-2" />
                                            Edit Trip
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              setShowDeleteConfirm(itinerary.id)
                                              setOpenDropdown(null)
                                            }}
                                            className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Trip
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {itinerary.description && (
                                <p className="text-sm text-stone-gray-600 mb-4 line-clamp-2">
                                  {itinerary.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between text-sm text-stone-gray-500">
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-1" />
                                  {itinerary.members.length} member{itinerary.members.length !== 1 ? 's' : ''}
                                </div>
                                <div>
                                  {totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              })()
            )}
          </>
        )}
      </main>

      {/* Edit Trip Modal */}
      {editingItinerary && (
        <EditTripModal
          itinerary={editingItinerary}
          onSave={handleEditItinerary}
          onClose={() => setEditingItinerary(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          itineraryId={showDeleteConfirm}
          itineraryTitle={itineraries.find(i => i.id === showDeleteConfirm)?.title || ''}
          onConfirm={handleDeleteItinerary}
          onClose={() => setShowDeleteConfirm(null)}
        />
      )}
    </div>
  )
}

// Edit Trip Modal Component
function EditTripModal({ itinerary, onSave, onClose }: {
  itinerary: Itinerary
  onSave: (data: Partial<Itinerary>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(itinerary.title)
  const [description, setDescription] = useState(itinerary.description || '')
  const [destination, setDestination] = useState(itinerary.destination)
  const [startDate, setStartDate] = useState(itinerary.startDate.split('T')[0])
  const [endDate, setEndDate] = useState(itinerary.endDate.split('T')[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title || !destination || !startDate || !endDate) {
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      alert('End date must be after start date')
      return
    }

    onSave({
      title,
      description,
      destination,
      startDate,
      endDate,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Trip</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination
            </label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-ocean-blue-600 text-white rounded-lg hover:bg-ocean-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Confirmation Modal Component
function DeleteConfirmModal({ itineraryId, itineraryTitle, onConfirm, onClose }: {
  itineraryId: string
  itineraryTitle: string
  onConfirm: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Trip</h3>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete <strong>&ldquo;{itineraryTitle}&rdquo;</strong>? This action cannot be undone and will delete all activities, accommodations, and other trip data.
        </p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(itineraryId)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Trip
          </button>
        </div>
      </div>
    </div>
  )
}
