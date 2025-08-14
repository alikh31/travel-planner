'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { PlusCircle, MapPin, Users, Calendar } from 'lucide-react'
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
                        
                        return (
                          <Link
                            key={itinerary.id}
                            href={`/itinerary/${itinerary.id}`}
                            className="bg-white rounded-lg shadow-sm border border-stone-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                          >
                            {/* Image Section */}
                            <TravelCardImages 
                              activities={allActivities}
                              destination={itinerary.destination}
                              itineraryId={itinerary.id}
                              totalActivities={totalActivities}
                            />
                            
                            {/* Content Section */}
                            <div className="p-6">
                              <div className="mb-4">
                                <h4 className="text-lg font-semibold text-stone-gray-900 mb-1">
                                  {itinerary.title}
                                </h4>
                                <div className="flex items-center text-sm text-stone-gray-600 mb-2">
                                  <MapPin className="h-4 w-4 mr-1" />
                                  {itinerary.destination}
                                </div>
                                <div className="flex items-center text-sm text-stone-gray-600">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {format(new Date(itinerary.startDate), 'MMM d')} - {format(new Date(itinerary.endDate), 'MMM d, yyyy')}
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
                          </Link>
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
    </div>
  )
}
