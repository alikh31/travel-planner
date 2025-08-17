'use client'

import { useState, useEffect, useMemo, useCallback, memo, use, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, ThumbsUp, ThumbsDown, MessageSquare, Edit3, Trash2, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { generateTempId } from '@/lib/utils'
import TimeGap from '@/components/TimeGap'
import TripHeader from '@/components/TripHeader'
import DaysAndActivities from '@/components/DaysAndActivities'
import MapSection from '@/components/MapSection'
import AddActivityModal from '@/components/AddActivityModal'
import EditActivityModal from '@/components/EditActivityModal'
import { getPlacePhoto } from '@/lib/googleMaps'

// Helper functions
const getEndTime = (startTime?: string, duration?: number): string | undefined => {
  if (!startTime || !duration) return undefined
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(start.getTime() + duration * 60 * 1000)
  return end.toTimeString().slice(0, 5)
}

const formatDuration = (duration?: number): string => {
  if (!duration) return ''
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  if (hours > 0 && minutes > 0) return ` (${hours}h ${minutes}m)`
  else if (hours > 0) return ` (${hours}h)`
  else return ` (${minutes}m)`
}

const getTimeWithOffset = (time: string, offsetMinutes: number): string => {
  const date = new Date(`2000-01-01T${time}`)
  date.setMinutes(date.getMinutes() + offsetMinutes)
  return date.toTimeString().slice(0, 5)
}

interface Activity {
  id: string
  title: string
  description?: string
  location?: string
  locationPlaceId?: string
  locationLat?: number | null
  locationLng?: number | null
  startTime?: string
  duration?: number
  cost?: number
  isGroupActivity: boolean
  createdBy: string
  creator: any
  suggestions: any[]
  votes: any[]
  comments: any[]
}

// Activity Item Component
const ActivityItem = memo(({ 
  activity, 
  activityNumber,
  session, 
  onVote, 
  onToggleComments, 
  onAddComment, 
  onEditActivity,
  onDeleteActivity,
  showComments, 
  newComment, 
  setNewComment, 
  isSubmittingComment,
  isAdmin,
  openDropdown,
  setOpenDropdown
}: {
  activity: Activity
  activityNumber?: number
  session: any
  onVote: (activityId: string, type: 'up' | 'down') => void
  onToggleComments: (activityId: string) => void
  onAddComment: (activityId: string) => void
  onEditActivity: (activity: Activity) => void
  onDeleteActivity: (activityId: string) => void
  showComments: string | null
  newComment: string
  setNewComment: (value: string) => void
  isSubmittingComment: boolean
  isAdmin: boolean
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
}) => {
  const [locationImage, setLocationImage] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)

  const getUserVote = useCallback((activity: Activity, userId: string) => {
    return activity.votes.find(vote => vote.userId === userId)
  }, [])

  const userVote = session?.user?.id ? getUserVote(activity, session.user.id) : null
  const upvotes = activity.votes.filter(vote => vote.type === 'up').length
  const downvotes = activity.votes.filter(vote => vote.type === 'down').length
  const canEdit = session?.user?.id === activity.createdBy || isAdmin

  const openGoogleMaps = (location: string) => {
    const query = encodeURIComponent(location)
    window.open(`https://www.google.com/maps/search/${query}`, '_blank')
  }

  // Fetch location image when activity has a place ID
  useEffect(() => {
    if (activity.locationPlaceId && !locationImage && !imageLoading) {
      setImageLoading(true)
      getPlacePhoto(activity.locationPlaceId)
        .then((photoUrl) => {
          setLocationImage(photoUrl)
        })
        .catch((error) => {
          console.error('Error fetching place photo:', error)
        })
        .finally(() => {
          setImageLoading(false)
        })
    }
  }, [activity.locationPlaceId, locationImage, imageLoading])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {activityNumber && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {activityNumber}
                </div>
              )}
              <h4 className="text-lg font-semibold text-gray-900 truncate">{activity.title}</h4>
            </div>
            {canEdit && (
              <div className="relative flex-shrink-0 ml-2" data-dropdown>
                <button
                  onClick={() => setOpenDropdown(openDropdown === activity.id ? null : activity.id)}
                  className="p-2 text-stone-gray-400 hover:text-stone-gray-600 hover:bg-stone-gray-50 rounded-lg touch-manipulation transition-colors"
                  title="Activity options"
                  aria-label="Activity options"
                  aria-expanded={openDropdown === activity.id}
                  aria-haspopup="true"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                
                {/* Dropdown Menu */}
                {openDropdown === activity.id && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-stone-gray-200 py-1 z-10">
                    <button
                      onClick={() => {
                        onEditActivity(activity)
                        setOpenDropdown(null)
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-stone-gray-700 hover:bg-stone-gray-50 transition-colors"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Activity
                    </button>
                    <button
                      onClick={() => {
                        onDeleteActivity(activity.id)
                        setOpenDropdown(null)
                      }}
                      className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Activity
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {activity.description && (
            <p className="text-stone-gray-600 mb-3">{activity.description}</p>
          )}

          {/* Location Image */}
          {locationImage && (
            <div className="mb-3">
              <img
                src={locationImage}
                alt={activity.location || 'Location'}
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Loading state for image */}
          {imageLoading && activity.locationPlaceId && (
            <div className="mb-3 w-full h-48 bg-stone-gray-200 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue-600"></div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
            {activity.startTime && (
              <span className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {activity.startTime}{formatDuration(activity.duration)}
              </span>
            )}
            {activity.location && (
              <button
                onClick={() => openGoogleMaps(activity.location!)}
                className="flex items-center hover:text-blue-600 transition-colors"
              >
                <MapPin className="h-4 w-4 mr-1" />
                {activity.location}
              </button>
            )}
            {activity.cost && (
              <span>${activity.cost}</span>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onVote(activity.id, 'up')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                    userVote?.type === 'up'
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{upvotes}</span>
                </button>
                <button
                  onClick={() => onVote(activity.id, 'down')}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
                    userVote?.type === 'down'
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>{downvotes}</span>
                </button>
              </div>
              
              <button
                onClick={() => onToggleComments(activity.id)}
                className="flex items-center space-x-1 text-gray-500 hover:text-blue-600 transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{activity.comments?.length || 0}</span>
              </button>
            </div>
            
            <div className="text-xs text-gray-400">
              by {activity.creator.name}
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments Section */}
      {showComments === activity.id && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3 mb-4">
            {activity.comments.map((comment: any) => (
              <div key={comment.id} className="flex space-x-3">
                <img
                  src={comment.user.image || '/default-avatar.png'}
                  alt={comment.user.name}
                  className="h-8 w-8 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{comment.user.name}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex space-x-3">
            <img
              src={session?.user?.image || '/default-avatar.png'}
              alt="You"
              className="h-8 w-8 rounded-full"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={() => onAddComment(activity.id)}
                  disabled={!newComment.trim() || isSubmittingComment}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingComment ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

ActivityItem.displayName = 'ActivityItem'

function ItineraryDetail({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { data: session } = useSession()
  // Handle both Promise and direct object for testing compatibility
  const resolvedParams = params instanceof Promise ? use(params) : params
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [itinerary, setItinerary] = useState<any>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(searchParams.get('day'))
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [mapAccommodation, setMapAccommodation] = useState<any>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeletingActivity, setIsDeletingActivity] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  
  // Track when we're programmatically updating URL to prevent double state updates
  const isUpdatingUrlRef = useRef(false)
  
  // New Activity Form State
  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    location: '',
    locationPlaceId: '',
    locationLat: null as number | null,
    locationLng: null as number | null,
    startTime: '',
    duration: '',
    cost: '',
    isGroupActivity: true
  })

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setOpenDropdown(null)
      }
    }

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Computed values
  const selectedDayData = useMemo(() => {
    if (!selectedDay || !itinerary) return null
    return itinerary.days.find((d: any) => d.id === selectedDay)
  }, [selectedDay, itinerary])

  // Memoized activities for map - only changes when location data changes
  const mapActivities = useMemo(() => {
    if (!selectedDayData?.activities) return []
    return selectedDayData.activities.map((activity: any, index: number) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      location: activity.location,
      locationPlaceId: activity.locationPlaceId,
      locationLat: activity.locationLat,
      locationLng: activity.locationLng,
      startTime: activity.startTime,
      duration: activity.duration,
      activityNumber: index + 2 // +2 to account for accommodation card at the beginning
    }))
  }, [selectedDayData?.activities?.map((a: any) => 
    `${a.id}-${a.title}-${a.location}-${a.locationPlaceId}-${a.locationLat}-${a.locationLng}-${a.startTime}-${a.duration}`
  ).join(',')]) // Only update when location-relevant data changes

  // Use backend-fetched accommodation location for the map
  const stableAccommodationLocation = useMemo(() => {
    return mapAccommodation?.location || undefined
  }, [mapAccommodation])

  // Create a completely stable key for the map that only changes when map data actually changes
  const mapKey = useMemo(() => {
    const accommodationPart = stableAccommodationLocation ? `-acc:${stableAccommodationLocation}` : ''
    return `${selectedDay}-${mapActivities.length}-${mapActivities.map((a: any) => `${a.id}-${a.locationLat}-${a.locationLng}`).join('|')}${accommodationPart}`
  }, [selectedDay, mapActivities, stableAccommodationLocation])

  // Stable callback for mobile map close
  const handleMapClose = useCallback(() => setShowMap(false), [])



  // URL management function
  const updateSelectedDay = useCallback((dayId: string | null) => {
    // Set flag to prevent double state update from URL change effect
    isUpdatingUrlRef.current = true
    
    setSelectedDay(dayId)
    
    // Update URL
    const newSearchParams = new URLSearchParams(searchParams.toString())
    if (dayId) {
      newSearchParams.set('day', dayId)
    } else {
      newSearchParams.delete('day')
    }
    
    // Use router.replace with just the search params
    const newUrl = newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''
    if (typeof window !== 'undefined') {
      router.replace(`${window.location.pathname}${newUrl}`, { scroll: false })
    }
    
    // Reset flag after a brief delay to allow URL update to propagate
    setTimeout(() => {
      isUpdatingUrlRef.current = false
    }, 50)
  }, [searchParams, router])

  const isAdmin = useMemo(() => {
    if (!session?.user?.id || !itinerary) return false
    const member = itinerary.members.find((m: any) => m.userId === session.user.id)
    return member?.role === 'admin' || itinerary.createdBy === session.user.id
  }, [session?.user?.id, itinerary])

  // Helper function to get accommodation for a specific date
  const getAccommodationForDate = useCallback((date: string | Date) => {
    if (!itinerary?.accommodations) return null
    
    return itinerary.accommodations.find((acc: any) => {
      if (!acc.checkIn) return false
      
      // Handle both Date objects and timestamps
      const checkInDate = new Date(acc.checkIn)
      const checkOutDate = acc.checkOut ? new Date(acc.checkOut) : new Date(checkInDate.getTime() + (acc.nights || 1) * 24 * 60 * 60 * 1000)
      const targetDate = new Date(date)
      
      // Check if target date falls within accommodation period (inclusive of check-in, exclusive of check-out)
      return targetDate >= checkInDate && targetDate < checkOutDate
    })
  }, [itinerary?.accommodations])

  // Function to get accommodation status for a specific date
  const getAccommodationStatusForDate = useCallback((date: string) => {
    if (!itinerary?.accommodations) {
      return { status: 'none', totalGuests: 0, memberCount: itinerary?.members?.length || 1 }
    }
    
    const relevantAccommodations = itinerary.accommodations.filter((accommodation: any) => {
      if (!accommodation.checkIn) return false
      
      // Handle both Date objects and timestamps
      const checkInDate = new Date(accommodation.checkIn)
      const checkOutDate = accommodation.checkOut ? new Date(accommodation.checkOut) : new Date(checkInDate.getTime() + (accommodation.nights || 1) * 24 * 60 * 60 * 1000)
      const targetDate = new Date(date)
      
      // Check if target date falls within accommodation period (inclusive of check-in, exclusive of check-out)
      return targetDate >= checkInDate && targetDate < checkOutDate
    })

    if (relevantAccommodations.length === 0) {
      return { status: 'none', totalGuests: 0, memberCount: itinerary?.members?.length || 1 }
    }

    const totalGuests = relevantAccommodations.reduce((total: number, accommodation: any) => total + (accommodation.guests || 0), 0)
    const tripMemberCount = itinerary?.members?.length || 1
    
    if (totalGuests >= tripMemberCount) {
      return { status: 'full', totalGuests, memberCount: tripMemberCount }
    } else if (totalGuests > 0) {
      return { status: 'partial', totalGuests, memberCount: tripMemberCount }
    } else {
      return { status: 'none', totalGuests: 0, memberCount: tripMemberCount }
    }
  }, [itinerary?.accommodations, itinerary?.members?.length])


  // Deep comparison function to detect actual data changes with strict delta-based approach
  const compareItineraryData = useCallback((oldData: any, newData: any): boolean => {
    if (!oldData || !newData) return true
    
    // Compare basic properties
    const basicPropsChanged = [
      'title', 'description', 'destination', 'startDate', 'endDate'
    ].some(prop => oldData[prop] !== newData[prop])
    
    if (basicPropsChanged) return true
    
    // Compare members with deep equality for maximum accuracy
    if (oldData.members?.length !== newData.members?.length) return true
    for (let i = 0; i < (oldData.members?.length || 0); i++) {
      const oldMember = oldData.members[i]
      const newMember = newData.members[i]
      if (JSON.stringify(oldMember) !== JSON.stringify(newMember)) {
        return true
      }
    }
    
    // Compare days and activities with deep equality to catch all changes
    if (oldData.days?.length !== newData.days?.length) return true
    for (let i = 0; i < (oldData.days?.length || 0); i++) {
      const oldDay = oldData.days[i]
      const newDay = newData.days[i]
      
      // Compare day properties
      if (oldDay.id !== newDay.id || oldDay.date !== newDay.date) return true
      
      // Deep compare activities (more reliable than individual property checks)
      if (JSON.stringify(oldDay.activities || []) !== JSON.stringify(newDay.activities || [])) {
        return true
      }
    }
    
    // Compare comments with deep equality
    if (JSON.stringify(oldData.comments || []) !== JSON.stringify(newData.comments || [])) {
      return true
    }
    
    return false
  }, [])

  // Separate functions for initial load vs background updates to eliminate any chance of day switching
  const loadItineraryInitial = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/itineraries/${id}`)
      if (response.ok) {
        const data = await response.json()
        setItinerary(data)
        
        // Only auto-select first day on true initial load (no existing itinerary and no selected day)
        if (!selectedDay && data.days?.length > 0) {
          const firstDayId = data.days[0].id
          updateSelectedDay(firstDayId)
        }
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error loading itinerary:', error)
      router.push('/')
    }
  }, [router, selectedDay, updateSelectedDay])
  
  const updateItineraryIfChanged = useCallback(async (id: string) => {
    if (!itinerary) return // Only run background updates if we already have data
    
    try {
      const response = await fetch(`/api/itineraries/${id}`)
      if (response.ok) {
        const newData = await response.json()
        
        // CRITICAL: Only update state if there are actual changes
        // This prevents unnecessary re-renders and maintains user context
        const hasChanges = compareItineraryData(itinerary, newData)
        if (hasChanges) {
          // Update itinerary data but NEVER EVER touch day selection
          // The user's current view is sacred and must be preserved at all costs
          setItinerary(newData)
        }
        // If no changes detected, do absolutely nothing - don't even log
      }
    } catch (error) {
      // Silently fail background updates to avoid disrupting user experience
      console.warn('Background update failed:', error)
    }
  }, [itinerary, compareItineraryData])


  useEffect(() => {
    if (resolvedParams.id && !itinerary) {
      loadItineraryInitial(resolvedParams.id as string)
    }
  }, [resolvedParams.id, itinerary, loadItineraryInitial])

  // Handle URL parameter changes (browser navigation)
  useEffect(() => {
    const dayFromUrl = searchParams.get('day')
    // Only update selectedDay from URL if there's an actual change
    // and we're not currently programmatically updating the URL ourselves
    // Also prevent changes during active polling to avoid mobile reset issues
    if (dayFromUrl !== selectedDay && !isUpdatingUrlRef.current && !isRefreshing) {
      setSelectedDay(dayFromUrl)
    }
  }, [searchParams, selectedDay, isRefreshing])

  // Fetch accommodation for the selected day from backend
  useEffect(() => {
    const fetchAccommodationForDay = async () => {
      if (!selectedDayData || !resolvedParams.id) {
        setMapAccommodation(null)
        return
      }
      
      try {
        const response = await fetch(`/api/itineraries/${resolvedParams.id}/accommodations?date=${selectedDayData.date}`)
        if (response.ok) {
          const data = await response.json()
          setMapAccommodation(data.accommodation)
        } else {
          setMapAccommodation(null)
        }
      } catch (error) {
        console.error('Error fetching accommodation for day:', error)
        setMapAccommodation(null)
      }
    }
    
    fetchAccommodationForDay()
  }, [selectedDayData, resolvedParams.id])

  // Background polling with strict delta-based updates - NEVER affects day selection
  useEffect(() => {
    if (!resolvedParams.id || !session || !itinerary) return

    const interval = setInterval(() => {
      // Only poll if:
      // 1. User is not actively interacting with the page
      // 2. Tab is visible 
      // 3. We have existing itinerary data to compare against
      if (!showAddActivity && !isSubmittingComment && !isDeletingActivity && !document.hidden) {
        updateItineraryIfChanged(resolvedParams.id as string)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [resolvedParams.id, session?.user?.id, itinerary, showAddActivity, isSubmittingComment, isDeletingActivity, updateItineraryIfChanged])

  // Event handlers
  const handleVote = useCallback(async (activityId: string, type: 'up' | 'down') => {
    if (!session?.user?.id || !itinerary) return

    // Optimistic update - immediately update the UI before server response
    setItinerary((prevItinerary: any) => {
      if (!prevItinerary) return prevItinerary
      
      return {
        ...prevItinerary,
        days: prevItinerary.days.map((day: any) => ({
          ...day,
          activities: day.activities.map((activity: any) => {
            if (activity.id !== activityId) return activity
            
            // Find existing vote from current user
            const existingVoteIndex = activity.votes.findIndex((v: any) => v.userId === session.user.id)
            const newVotes = [...activity.votes]
            
            if (existingVoteIndex >= 0) {
              // Update existing vote
              newVotes[existingVoteIndex] = {
                ...newVotes[existingVoteIndex],
                type
              }
            } else {
              // Add new vote
              newVotes.push({
                id: generateTempId(),
                userId: session.user.id,
                type,
                createdAt: new Date().toISOString()
              })
            }
            
            return {
              ...activity,
              votes: newVotes
            }
          })
        }))
      }
    })

    try {
      const response = await fetch(`/api/activities/${activityId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      if (!response.ok) {
        // Revert optimistic update on error
        await updateItineraryIfChanged(resolvedParams.id as string)
        const error = await response.json()
        console.error('Error voting:', error)
      }
      // Don't fetch on success - the optimistic update is already applied
    } catch (error) {
      // Revert optimistic update on error
      await updateItineraryIfChanged(resolvedParams.id as string)
      console.error('Error voting:', error)
    }
  }, [session?.user?.id, resolvedParams.id, itinerary, updateItineraryIfChanged])

  const handleToggleComments = useCallback((activityId: string) => {
    setShowComments(showComments === activityId ? null : activityId)
  }, [showComments])

  const handleAddComment = useCallback(async (activityId: string) => {
    if (!newComment.trim() || !session?.user?.id || !itinerary) return

    const commentContent = newComment.trim()
    setIsSubmittingComment(true)
    setNewComment('') // Clear input immediately

    // Optimistic update - immediately add comment to UI
    const tempComment = {
      id: generateTempId(),
      content: commentContent,
      userId: session.user.id,
      user: {
        id: session.user.id,
        name: session.user.name || 'You',
        image: session.user.image || null
      },
      createdAt: new Date().toISOString()
    }

    setItinerary((prevItinerary: any) => {
      if (!prevItinerary) return prevItinerary
      
      return {
        ...prevItinerary,
        days: prevItinerary.days.map((day: any) => ({
          ...day,
          activities: day.activities.map((activity: any) => {
            if (activity.id !== activityId) return activity
            
            return {
              ...activity,
              comments: [...activity.comments, tempComment]
            }
          })
        }))
      }
    })

    try {
      const response = await fetch(`/api/activities/${activityId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent })
      })

      if (!response.ok) {
        // Revert optimistic update and restore comment text on error
        setNewComment(commentContent)
        await updateItineraryIfChanged(resolvedParams.id as string)
        const error = await response.json()
        alert(error.error || 'Failed to add comment. Please try again.')
      }
      // Don't fetch on success - the optimistic update is already applied
    } catch (error) {
      // Revert optimistic update and restore comment text on error
      setNewComment(commentContent)
      await updateItineraryIfChanged(resolvedParams.id as string)
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [newComment, session?.user?.id, resolvedParams.id, itinerary, updateItineraryIfChanged])

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return
    if (!session?.user?.id || !itinerary) return

    setIsDeletingActivity(true)

    // Optimistic update - remove activity immediately
    setItinerary((prevItinerary: any) => {
      if (!prevItinerary) return prevItinerary
      
      return {
        ...prevItinerary,
        days: prevItinerary.days.map((day: any) => ({
          ...day,
          activities: day.activities.filter((activity: any) => activity.id !== activityId)
        }))
      }
    })

    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        // Revert optimistic update on error
        await updateItineraryIfChanged(resolvedParams.id as string)
        const error = await response.json()
        alert(error.error || 'Failed to delete activity. Please try again.')
      }
      // Don't fetch on success - optimistic update is already applied
    } catch (error) {
      // Revert optimistic update on error
      await updateItineraryIfChanged(resolvedParams.id as string)
      console.error('Error deleting activity:', error)
      alert('Failed to delete activity. Please try again.')
    } finally {
      setIsDeletingActivity(false)
    }
  }, [session?.user?.id, resolvedParams.id, itinerary, updateItineraryIfChanged])

  const handleAddActivity = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Enhanced validation
    if (!selectedDay) {
      alert('Please select a day first.')
      return
    }
    
    if (!newActivity.title.trim()) {
      alert('Please enter an activity title.')
      return
    }
    
    if (!session?.user?.id) {
      alert('You must be logged in to add activities.')
      return
    }

    try {
      const response = await fetch(`/api/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayId: selectedDay,
          ...newActivity,
          duration: newActivity.duration ? parseInt(newActivity.duration) : null,
          cost: newActivity.cost ? parseFloat(newActivity.cost) : null
        })
      })

      if (response.ok) {
        setShowAddActivity(false)
        setNewActivity({
          title: '',
          description: '',
          location: '',
          locationPlaceId: '',
          locationLat: null,
          locationLng: null,
          startTime: '',
          duration: '',
          cost: '',
          isGroupActivity: true
        })
        await updateItineraryIfChanged(resolvedParams.id as string)
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          alert('You are not authorized to add activities. Please log in again.')
        } else if (response.status === 403) {
          alert('You do not have permission to add activities to this itinerary.')
        } else {
          alert(errorData.error || 'Failed to add activity. Please try again.')
        }
        console.error('Error adding activity:', errorData)
      }
    } catch (error) {
      console.error('Error adding activity:', error)
      alert('Failed to add activity due to a network error. Please check your connection and try again.')
    }
  }, [selectedDay, newActivity, resolvedParams.id, session?.user?.id, updateItineraryIfChanged])

  const handleUpdateActivity = useCallback(async (updatedActivity: Activity) => {
    if (!session?.user?.id) {
      alert('You must be logged in to update activities.')
      return
    }

    try {
      const response = await fetch(`/api/activities/${updatedActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedActivity.title,
          description: updatedActivity.description,
          location: updatedActivity.location,
          locationPlaceId: updatedActivity.locationPlaceId,
          locationLat: updatedActivity.locationLat,
          locationLng: updatedActivity.locationLng,
          startTime: updatedActivity.startTime,
          duration: updatedActivity.duration,
          cost: updatedActivity.cost,
          isGroupActivity: updatedActivity.isGroupActivity
        })
      })

      if (response.ok) {
        setEditingActivity(null)
        await updateItineraryIfChanged(resolvedParams.id as string)
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          alert('You are not authorized to update activities. Please log in again.')
        } else if (response.status === 403) {
          alert('You do not have permission to update activities in this itinerary.')
        } else {
          alert(errorData.error || 'Failed to update activity. Please try again.')
        }
        console.error('Error updating activity:', errorData)
      }
    } catch (error) {
      console.error('Error updating activity:', error)
      alert('Failed to update activity due to a network error. Please check your connection and try again.')
    }
  }, [session?.user?.id, resolvedParams.id, updateItineraryIfChanged])

  const updateMemberRole = useCallback(async (userId: string, role: 'admin' | 'member') => {
    if (!session?.user?.id || !isAdmin) {
      alert('You do not have permission to update member roles.')
      return
    }

    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      })

      if (response.ok) {
        await updateItineraryIfChanged(resolvedParams.id as string)
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          alert('You are not authorized to perform this action. Please log in again.')
        } else if (response.status === 403) {
          alert('You do not have permission to update member roles.')
        } else {
          alert(errorData.error || 'Failed to update member role. Please try again.')
        }
        console.error('Error updating member role:', errorData)
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      alert('Failed to update member role due to a network error. Please try again.')
    }
  }, [resolvedParams.id, session?.user?.id, isAdmin, updateItineraryIfChanged])

  const removeMember = useCallback(async (userId: string) => {
    if (!session?.user?.id || !isAdmin) {
      alert('You do not have permission to remove members.')
      return
    }
    
    if (!confirm('Are you sure you want to remove this member? They will lose access to this itinerary.')) return

    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}/members?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await updateItineraryIfChanged(resolvedParams.id as string)
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          alert('You are not authorized to perform this action. Please log in again.')
        } else if (response.status === 403) {
          alert('You do not have permission to remove members.')
        } else {
          alert(errorData.error || 'Failed to remove member. Please try again.')
        }
        console.error('Error removing member:', errorData)
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member due to a network error. Please try again.')
    }
  }, [resolvedParams.id, session?.user?.id, isAdmin, updateItineraryIfChanged])




  // Enhanced loading and error states
  if (!session) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600 mx-auto mb-4"></div>
          <p className="text-stone-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600 mx-auto mb-4"></div>
          <p className="text-stone-gray-600">Loading itinerary...</p>
          <p className="text-sm text-stone-gray-500 mt-2">If this takes too long, please refresh the page.</p>
        </div>
      </div>
    )
  }

  // Session validation - ensure user has access to this itinerary
  const userHasAccess = itinerary.members?.some((member: any) => member.userId === session.user?.id) || 
                       itinerary.createdBy === session.user?.id
  
  if (!userHasAccess) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-sunset-coral-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-stone-gray-900 mb-2">Access Denied</h1>
          <p className="text-stone-gray-600 mb-4">You do not have permission to view this itinerary.</p>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
          >
            Return Home
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
        isRefreshing={isRefreshing}
      />

      {/* Main Content */}
      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Left Side - 40% */}
        <div className="w-full xl:w-2/5 flex flex-col">

          {/* Days and Activities Section - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <DaysAndActivities
              itinerary={itinerary}
              selectedDay={selectedDay}
              setSelectedDay={updateSelectedDay}
              selectedDayData={selectedDayData}
              setShowAddActivity={setShowAddActivity}
              setShowMap={setShowMap}
              ActivityItem={ActivityItem}
              session={session}
              handleVote={handleVote}
              setEditingActivity={setEditingActivity}
              handleDeleteActivity={handleDeleteActivity}
              handleToggleComments={handleToggleComments}
              showComments={showComments}
              newComment={newComment}
              setNewComment={setNewComment}
              handleAddComment={handleAddComment}
              isSubmittingComment={isSubmittingComment}
              isAdmin={isAdmin}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              getAccommodationForDate={getAccommodationForDate}
              getAccommodationStatusForDate={getAccommodationStatusForDate}
              getTimeWithOffset={getTimeWithOffset}
              getEndTime={getEndTime}
              TimeGap={TimeGap}
            />
          </div>
        </div>

        {/* Right Side - 60% - Map (Hidden on small screens) */}
        <div className="hidden xl:block xl:w-3/5 h-full">
          <MapSection
            key={mapKey}
            activities={mapActivities}
            selectedDay={selectedDay}
            hasSelectedDay={mapActivities.length > 0}
            accommodationLocation={stableAccommodationLocation}
          />
        </div>
      </div>

      {/* Mobile Map Modal - Always mounted but hidden when not shown to prevent re-mounting */}
      <div className={showMap ? 'block' : 'hidden'}>
        <MapSection
          key={mapKey}
          activities={mapActivities}
          selectedDay={selectedDay}
          hasSelectedDay={mapActivities.length > 0}
          accommodationLocation={stableAccommodationLocation}
          isMobile={true}
          onClose={handleMapClose}
        />
      </div>

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        onSubmit={handleAddActivity}
      />

      {/* Edit Activity Modal */}
      <EditActivityModal
        isOpen={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        activity={editingActivity}
        onSubmit={handleUpdateActivity}
      />


    </div>
  )
}

// Export default page component that matches Next.js Page interface
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ItineraryDetail params={params} />
}