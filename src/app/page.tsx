'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { PlusCircle, MapPin, Users, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-8">
            <MapPin className="mx-auto h-16 w-16 text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Travel Planner</h1>
            <p className="text-gray-600">Plan your perfect trip together</p>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              Collaborate with friends and family
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-5 w-5 mr-2 text-blue-500" />
              Plan day-by-day itineraries
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <PlusCircle className="h-5 w-5 mr-2 text-blue-500" />
              Vote on activities and suggestions
            </div>
          </div>

          <button
            onClick={() => signIn('google')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MapPin className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Travel Planner</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <img
                  src={session.user?.image || '/default-avatar.png'}
                  alt={session.user?.name || 'User'}
                  className="h-8 w-8 rounded-full mr-2"
                />
                {session.user?.name}
              </div>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Travel Plans</h2>
              <p className="text-gray-600">Create and manage your collaborative itineraries</p>
            </div>
            
            <Link
              href="/itinerary/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itineraries.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                <div className="text-gray-400 mb-4">
                  <Calendar className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No itineraries yet</h3>
                <p className="text-gray-600 mb-4">Create your first travel plan to get started</p>
                <Link
                  href="/itinerary/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Create Itinerary
                </Link>
              </div>
            ) : (
              itineraries.map((itinerary) => {
                const totalActivities = itinerary.days.reduce(
                  (total, day) => total + day.activities.length,
                  0
                )
                
                return (
                  <Link
                    key={itinerary.id}
                    href={`/itinerary/${itinerary.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {itinerary.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {itinerary.destination}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(itinerary.startDate), 'MMM d')} - {format(new Date(itinerary.endDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    {itinerary.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {itinerary.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {itinerary.members.length} member{itinerary.members.length !== 1 ? 's' : ''}
                      </div>
                      <div>
                        {totalActivities} activit{totalActivities !== 1 ? 'ies' : 'y'}
                      </div>
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        )}
      </main>
    </div>
  )
}
