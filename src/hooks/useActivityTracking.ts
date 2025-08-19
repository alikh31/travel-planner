import { useCallback, useRef, useEffect } from 'react'

interface ActivityTrackingParams {
  itineraryId: string
  sessionId: string
  dayId?: string
}

interface PlaceActivity {
  placeId: string
  placeName: string
  placeIndex: number
  activityId?: string
  viewStartTime?: number
  imageSlideCount: number
  wishlistAdded: boolean
  wishlistTime?: number
  isGptSuggestion?: boolean
  gptCategory?: string
  searchSource?: string
}

export function useActivityTracking({ itineraryId, sessionId, dayId }: ActivityTrackingParams) {
  const currentActivity = useRef<PlaceActivity | null>(null)
  const activities = useRef<Map<string, PlaceActivity>>(new Map())

  // Start tracking a place view
  const startPlaceView = useCallback(async (
    placeId: string, 
    placeName: string, 
    placeIndex: number,
    metadata?: {
      isGptSuggestion?: boolean
      gptCategory?: string
      searchSource?: string
    }
  ) => {
    try {
      // End previous activity if exists
      if (currentActivity.current) {
        await endPlaceView()
      }

      const startTime = Date.now()
      
      // Create new activity
      const newActivity: PlaceActivity = {
        placeId,
        placeName,
        placeIndex,
        viewStartTime: startTime,
        imageSlideCount: 0,
        wishlistAdded: false,
        isGptSuggestion: metadata?.isGptSuggestion,
        gptCategory: metadata?.gptCategory,
        searchSource: metadata?.searchSource
      }

      currentActivity.current = newActivity
      activities.current.set(placeId, newActivity)

      // Call API to start tracking
      const response = await fetch('/api/user-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itineraryId,
          sessionId,
          placeId,
          placeName,
          placeIndex,
          dayId,
          isGptSuggestion: metadata?.isGptSuggestion,
          gptCategory: metadata?.gptCategory,
          searchSource: metadata?.searchSource
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (currentActivity.current && currentActivity.current.placeId === placeId) {
          currentActivity.current.activityId = result.activityId
          activities.current.set(placeId, currentActivity.current)
        }
      }
    } catch (error) {
      console.error('Error starting place view tracking:', error)
    }
  }, [itineraryId, sessionId, dayId])

  // End current place view
  const endPlaceView = useCallback(async () => {
    if (!currentActivity.current) return

    try {
      const activity = currentActivity.current
      const activityData = activities.current.get(activity.placeId)

      if (activityData?.activityId) {
        await fetch('/api/user-activity', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activityId: activityData.activityId,
            imageSlides: activityData.imageSlideCount,
            addedToWishlist: activityData.wishlistAdded,
            timeToWishlist: activityData.wishlistTime,
            endView: true
          })
        })
      }

      currentActivity.current = null
    } catch (error) {
      console.error('Error ending place view tracking:', error)
    }
  }, [])

  // Track image slide
  const trackImageSlide = useCallback(() => {
    if (currentActivity.current) {
      currentActivity.current.imageSlideCount++
      activities.current.set(currentActivity.current.placeId, currentActivity.current)
    }
  }, [])

  // Track wishlist addition
  const trackWishlistAdd = useCallback(async (placeId: string) => {
    const activity = activities.current.get(placeId)
    if (activity && !activity.wishlistAdded) {
      activity.wishlistAdded = true
      
      if (activity.viewStartTime) {
        activity.wishlistTime = Date.now() - activity.viewStartTime
      }
      
      activities.current.set(placeId, activity)

      // Update API immediately for wishlist addition
      if (activity.activityId) {
        try {
          await fetch('/api/user-activity', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              activityId: activity.activityId,
              addedToWishlist: true,
              timeToWishlist: activity.wishlistTime,
              imageSlides: activity.imageSlideCount
            })
          })
        } catch (error) {
          console.error('Error tracking wishlist addition:', error)
        }
      }
    }
  }, [])

  // Clean up on unmount or when leaving explore page
  useEffect(() => {
    return () => {
      endPlaceView()
    }
  }, [endPlaceView])

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        endPlaceView()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [endPlaceView])

  return {
    startPlaceView,
    endPlaceView,
    trackImageSlide,
    trackWishlistAdd,
    getCurrentActivity: () => currentActivity.current,
    getAllActivities: () => Array.from(activities.current.values())
  }
}