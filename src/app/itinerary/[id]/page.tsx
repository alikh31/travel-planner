'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, ThumbsUp, ThumbsDown, MessageSquare, Edit3, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { generateTempId } from '@/lib/utils'
import TimeGap from '@/components/TimeGap'
import AccommodationPlanner from '@/components/AccommodationPlanner'
import ActivitiesMap from '@/components/ActivitiesMap'
import TripHeader from '@/components/TripHeader'
import DaysAndActivities from '@/components/DaysAndActivities'
import MapSection from '@/components/MapSection'
import AddActivityModal from '@/components/AddActivityModal'
import AddMemberModal from '@/components/AddMemberModal'
import AddAccommodationModal from '@/components/AddAccommodationModal'
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
  locationLat?: number
  locationLng?: number
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
  isAdmin
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
            <div className="flex items-center space-x-3">
              {activityNumber && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {activityNumber}
                </div>
              )}
              <h4 className="text-lg font-semibold text-gray-900">{activity.title}</h4>
            </div>
            {canEdit && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onEditActivity(activity)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Edit activity"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteActivity(activity.id)}
                  className="text-red-400 hover:text-red-600"
                  title="Delete activity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          
          {activity.description && (
            <p className="text-gray-600 mb-3">{activity.description}</p>
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
            <div className="mb-3 w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

export default function ItineraryDetail() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  
  // State
  const [itinerary, setItinerary] = useState<any>(null)
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [showAddAccommodation, setShowAddAccommodation] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeletingActivity, setIsDeletingActivity] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  
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

  // New Accommodation State
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

  const isAdmin = useMemo(() => {
    if (!session?.user?.id || !itinerary) return false
    const member = itinerary.members.find((m: any) => m.userId === session.user.id)
    return member?.role === 'admin' || itinerary.createdBy === session.user.id
  }, [session?.user?.id, itinerary])

  // Helper function to get accommodation for a specific date
  const getAccommodationForDate = useCallback((date: string) => {
    return accommodations.find(acc => {
      if (!acc.checkIn || !acc.nights) return false
      
      const checkInDate = new Date(acc.checkIn)
      const checkOutDate = new Date(checkInDate.getTime() + acc.nights * 24 * 60 * 60 * 1000)
      const targetDate = new Date(date)
      
      // Check if target date falls within accommodation period (inclusive of check-in, exclusive of check-out)
      return targetDate >= checkInDate && targetDate < checkOutDate
    })
  }, [accommodations])

  // Function to get accommodation status for a specific date
  const getAccommodationStatusForDate = useCallback((date: string) => {
    const relevantAccommodations = accommodations.filter(accommodation => {
      if (!accommodation.checkIn || !accommodation.nights) return false
      
      const checkInDate = new Date(accommodation.checkIn)
      const checkOutDate = new Date(checkInDate.getTime() + accommodation.nights * 24 * 60 * 60 * 1000)
      const targetDate = new Date(date)
      
      // Check if target date falls within accommodation period (inclusive of check-in, exclusive of check-out)
      return targetDate >= checkInDate && targetDate < checkOutDate
    })

    if (relevantAccommodations.length === 0) {
      return { status: 'none', totalGuests: 0, memberCount: itinerary?.members?.length || 1 }
    }

    const totalGuests = relevantAccommodations.reduce((total, accommodation) => total + (accommodation.guests || 0), 0)
    const tripMemberCount = itinerary?.members?.length || 1
    
    if (totalGuests >= tripMemberCount) {
      return { status: 'full', totalGuests, memberCount: tripMemberCount }
    } else if (totalGuests > 0) {
      return { status: 'partial', totalGuests, memberCount: tripMemberCount }
    } else {
      return { status: 'none', totalGuests: 0, memberCount: tripMemberCount }
    }
  }, [accommodations, itinerary?.members?.length])


  // Helper function to check for changes between old and new itinerary data
  const checkForChanges = useCallback((oldData: any, newData: any) => {
    // Check for basic property changes
    if (
      oldData.title !== newData.title ||
      oldData.description !== newData.description ||
      oldData.destination !== newData.destination ||
      oldData.startDate !== newData.startDate ||
      oldData.endDate !== newData.endDate
    ) {
      return true
    }

    // Check for member changes
    if (oldData.members.length !== newData.members.length) return true
    for (let i = 0; i < oldData.members.length; i++) {
      const oldMember = oldData.members[i]
      const newMember = newData.members[i]
      if (
        oldMember.user.id !== newMember.user.id ||
        oldMember.role !== newMember.role
      ) {
        return true
      }
    }

    // Check for day/activity changes
    if (oldData.days.length !== newData.days.length) return true
    for (let i = 0; i < oldData.days.length; i++) {
      const oldDay = oldData.days[i]
      const newDay = newData.days[i]
      
      if (oldDay.activities.length !== newDay.activities.length) return true
      
      for (let j = 0; j < oldDay.activities.length; j++) {
        const oldActivity = oldDay.activities[j]
        const newActivity = newDay.activities[j]
        
        if (
          oldActivity.id !== newActivity.id ||
          oldActivity.title !== newActivity.title ||
          oldActivity.description !== newActivity.description ||
          oldActivity.votes?.length !== newActivity.votes?.length ||
          oldActivity.comments?.length !== newActivity.comments?.length
        ) {
          return true
        }

        // Check for vote content changes (e.g., upvote to downvote)
        if (oldActivity.votes?.length === newActivity.votes?.length) {
          for (let k = 0; k < oldActivity.votes.length; k++) {
            const oldVote = oldActivity.votes[k]
            const newVote = newActivity.votes.find((v: any) => v.userId === oldVote.userId)
            if (!newVote || oldVote.type !== newVote.type) {
              return true
            }
          }
        }
      }
    }

    return false
  }, [])

  // Load itinerary
  const fetchItinerary = useCallback(async (id: string, isBackgroundUpdate = false) => {
    try {
      // Only show loading/refreshing indicators appropriately
      if (!itinerary) {
        // Initial load
      } else if (!isBackgroundUpdate) {
        setIsRefreshing(true)
      }

      const response = await fetch(`/api/itineraries/${id}`)
      if (response.ok) {
        const newData = await response.json()
        
        // If this is a background update, only update if there are actual changes
        if (isBackgroundUpdate && itinerary) {
          const hasChanges = checkForChanges(itinerary, newData)
          if (hasChanges) {
            setItinerary(newData)
            // For background updates, preserve the selected day if it still exists
            // Only set to first day if no day is currently selected or selected day no longer exists
            setSelectedDay(prevSelectedDay => {
              if (prevSelectedDay && newData.days.some((day: any) => day.id === prevSelectedDay)) {
                return prevSelectedDay // Keep current selection if it still exists
              }
              return newData.days.length > 0 ? newData.days[0].id : null
            })
          }
        } else {
          setItinerary(newData)
          // For non-background updates, preserve selected day or set to first day
          setSelectedDay(prevSelectedDay => {
            if (prevSelectedDay && newData.days.some((day: any) => day.id === prevSelectedDay)) {
              return prevSelectedDay // Keep current selection if it still exists
            }
            return newData.days.length > 0 ? newData.days[0].id : null
          })
        }
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
      if (!itinerary) {
        router.push('/')
      }
    } finally {
      setIsRefreshing(false)
    }
  }, [router, checkForChanges])

  // Load accommodations from localStorage (API route doesn't exist yet)
  const loadAccommodations = useCallback(async (itineraryId: string) => {
    try {
      // Load directly from localStorage since API route doesn't exist
      const savedAccommodations = localStorage.getItem(`accommodations-${itineraryId}`)
      if (savedAccommodations) {
        try {
          const parsedAccommodations = JSON.parse(savedAccommodations)
          setAccommodations(parsedAccommodations)
        } catch (parseError) {
          console.error('Error parsing saved accommodations:', parseError)
          setAccommodations([])
        }
      } else {
        setAccommodations([])
      }
    } catch (error) {
      console.error('Error loading accommodations:', error)
      setAccommodations([])
    }
  }, [])

  useEffect(() => {
    if (params.id) {
      fetchItinerary(params.id as string)
      loadAccommodations(params.id as string)
    }
  }, [params.id]) // Only depend on params.id

  // Polling effect to refresh data every 5 seconds
  useEffect(() => {
    if (!params.id || !session) return

    const interval = setInterval(() => {
      // Only poll if user is not actively interacting with the page and tab is visible
      if (!showAddActivity && !showAddMember && !isSubmittingComment && !isDeletingActivity && !document.hidden) {
        fetchItinerary(params.id as string, true) // true = background update
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [params.id, session?.user?.id, showAddActivity, showAddMember, isSubmittingComment, isDeletingActivity]) // Include all polling conditions

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
        await fetchItinerary(params.id as string, true)
        const error = await response.json()
        console.error('Error voting:', error)
      }
      // Don't fetch on success - the optimistic update is already applied
    } catch (error) {
      // Revert optimistic update on error
      await fetchItinerary(params.id as string, true)
      console.error('Error voting:', error)
    }
  }, [session?.user?.id, params.id, itinerary, fetchItinerary])

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
        await fetchItinerary(params.id as string, true)
        const error = await response.json()
        alert(error.error || 'Failed to add comment. Please try again.')
      }
      // Don't fetch on success - the optimistic update is already applied
    } catch (error) {
      // Revert optimistic update and restore comment text on error
      setNewComment(commentContent)
      await fetchItinerary(params.id as string, true)
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    } finally {
      setIsSubmittingComment(false)
    }
  }, [newComment, session?.user?.id, params.id, itinerary, fetchItinerary])

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
        await fetchItinerary(params.id as string, true)
        const error = await response.json()
        alert(error.error || 'Failed to delete activity. Please try again.')
      }
      // Don't fetch on success - optimistic update is already applied
    } catch (error) {
      // Revert optimistic update on error
      await fetchItinerary(params.id as string, true)
      console.error('Error deleting activity:', error)
      alert('Failed to delete activity. Please try again.')
    } finally {
      setIsDeletingActivity(false)
    }
  }, [session?.user?.id, params.id, itinerary, fetchItinerary])

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
        await fetchItinerary(params.id as string, true)
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
  }, [selectedDay, newActivity, params.id, session?.user?.id, fetchItinerary])

  const updateMemberRole = useCallback(async (userId: string, role: 'admin' | 'member') => {
    if (!session?.user?.id || !isAdmin) {
      alert('You do not have permission to update member roles.')
      return
    }

    try {
      const response = await fetch(`/api/itineraries/${params.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      })

      if (response.ok) {
        await fetchItinerary(params.id as string, true)
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
  }, [params.id, session?.user?.id, isAdmin, fetchItinerary])

  const removeMember = useCallback(async (userId: string) => {
    if (!session?.user?.id || !isAdmin) {
      alert('You do not have permission to remove members.')
      return
    }
    
    if (!confirm('Are you sure you want to remove this member? They will lose access to this itinerary.')) return

    try {
      const response = await fetch(`/api/itineraries/${params.id}/members?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchItinerary(params.id as string, true)
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
  }, [params.id, session?.user?.id, isAdmin, fetchItinerary])

  // Helper function to toggle amenities

  // Accommodation handlers
  const handleAddAccommodation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newAccommodation.name.trim() || !newAccommodation.location.trim()) {
      alert('Please enter accommodation name and location')
      return
    }

    try {
      const accommodation = {
        ...newAccommodation,
        id: generateTempId('accommodation')
      }

      // Save to localStorage (same logic as AccommodationPlanner)
      const savedAccommodations = localStorage.getItem(`accommodations-${params.id}`)
      const existingAccommodations = savedAccommodations ? JSON.parse(savedAccommodations) : []
      const updatedAccommodations = [...existingAccommodations, accommodation]
      
      localStorage.setItem(`accommodations-${params.id}`, JSON.stringify(updatedAccommodations))
      
      // Reset form
      const memberCount = itinerary?.members?.length || 1
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
        guests: memberCount,
        amenities: [],
        notes: ''
      })
      
      setShowAddAccommodation(false)
      
      // Refresh accommodations
      loadAccommodations(params.id as string)
    } catch (error) {
      console.error('Error adding accommodation:', error)
      alert('Failed to add accommodation. Please try again.')
    }
  }

  // Modal handlers
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) return

    setIsAddingMember(true)
    try {
      const response = await fetch(`/api/itineraries/${params.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail.trim() })
      })

      if (response.ok) {
        setShowAddMember(false)
        setNewMemberEmail('')
        await fetchItinerary(params.id as string, true)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to add member')
      }
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member')
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleCloseAddAccommodation = () => {
    const memberCount = itinerary?.members?.length || 1
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
      guests: memberCount,
      amenities: [],
      notes: ''
    })
    setShowAddAccommodation(false)
  }

  // Enhanced loading and error states
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading itinerary...</p>
          <p className="text-sm text-gray-500 mt-2">If this takes too long, please refresh the page.</p>
        </div>
      </div>
    )
  }

  // Session validation - ensure user has access to this itinerary
  const userHasAccess = itinerary.members?.some((member: any) => member.userId === session.user?.id) || 
                       itinerary.createdBy === session.user?.id
  
  if (!userHasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You do not have permission to view this itinerary.</p>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TripHeader
        itinerary={itinerary}
        session={session}
        isAdmin={isAdmin}
        showMembers={showMembers}
        setShowMembers={setShowMembers}
        setShowAddMember={setShowAddMember}
        updateMemberRole={updateMemberRole}
        removeMember={removeMember}
        isRefreshing={isRefreshing}
      />

      {/* Main Content */}
      <div className="flex" style={{ height: 'calc(100vh - 80px)' }}>
        {/* Left Side - 40% */}
        <div className="w-full xl:w-2/5 flex flex-col">
          {/* Accommodation Section */}
          <div className="p-4 border-b border-gray-200">
            <AccommodationPlanner 
              itineraryId={itinerary.id} 
              onAccommodationsChange={() => loadAccommodations(itinerary.id)}
              onAddAccommodation={() => {
                const memberCount = itinerary?.members?.length || 1
                setNewAccommodation(prev => ({
                  ...prev,
                  guests: memberCount,
                  checkIn: ''
                }))
                setShowAddAccommodation(true)
              }}
            />
          </div>

          {/* Days and Activities Section - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <DaysAndActivities
              itinerary={itinerary}
              selectedDay={selectedDay}
              setSelectedDay={setSelectedDay}
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
            activities={mapActivities}
            selectedDay={selectedDay}
            hasSelectedDay={!!selectedDayData}
            accommodationLocation={selectedDayData ? getAccommodationForDate(selectedDayData.date)?.location : undefined}
          />
        </div>
      </div>

      {/* Mobile Map Modal */}
      {showMap && selectedDayData && (
        <ActivitiesMap
          activities={selectedDayData.activities}
          selectedDay={selectedDay || undefined}
          onClose={() => setShowMap(false)}
          isModal={true}
        />
      )}

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        newActivity={newActivity}
        setNewActivity={setNewActivity}
        onSubmit={handleAddActivity}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        newMemberEmail={newMemberEmail}
        setNewMemberEmail={setNewMemberEmail}
        isAddingMember={isAddingMember}
        onSubmit={handleAddMemberSubmit}
      />

      {/* Add Accommodation Modal */}
      <AddAccommodationModal
        isOpen={showAddAccommodation}
        onClose={handleCloseAddAccommodation}
        newAccommodation={newAccommodation}
        setNewAccommodation={setNewAccommodation}
        onSubmit={handleAddAccommodation}
      />
    </div>
  )
}