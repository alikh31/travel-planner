'use client'

import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Map, Hotel, AlertCircle, AlertTriangle, Compass } from 'lucide-react'
import AccommodationCard from './AccommodationCard'
import Commute from './Commute'
import { getDayDate } from '@/lib/date-utils'

interface DaysAndActivitiesProps {
  itinerary: any
  selectedDay: string | null
  setSelectedDay: (dayId: string) => void
  selectedDayData: any
  setShowAddActivity: (show: boolean) => void
  setShowMap: (show: boolean) => void
  ActivityItem: any
  session: any
  handleVote: any
  setEditingActivity: any
  handleDeleteActivity: any
  handleToggleComments: any
  showComments: any
  newComment: string
  setNewComment: any
  handleAddComment: any
  isSubmittingComment: boolean
  isAdmin: boolean
  getAccommodationForDate: any
  getAccommodationStatusForDate: any
  getTimeWithOffset: any
  getEndTime: any
  TimeGap: any
  openDropdown: string | null
  setOpenDropdown: (id: string | null) => void
  setAddActivityContext: (context: { afterActivityId?: string; suggestedStartTime?: string; previousLocation?: { lat: number; lng: number } }) => void
}

export default function DaysAndActivities({
  itinerary,
  selectedDay,
  setSelectedDay,
  selectedDayData,
  setShowAddActivity,
  setShowMap,
  ActivityItem,
  session,
  handleVote,
  setEditingActivity,
  handleDeleteActivity,
  handleToggleComments,
  showComments,
  newComment,
  setNewComment,
  handleAddComment,
  isSubmittingComment,
  isAdmin,
  getAccommodationForDate,
  getAccommodationStatusForDate,
  getEndTime,
  TimeGap,
  openDropdown,
  setOpenDropdown,
  setAddActivityContext
}: DaysAndActivitiesProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Calculate current day date for consistent use throughout component
  const selectedDayDate = selectedDayData ? getDayDate(itinerary.startDate, selectedDayData.dayIndex || 0) : null

  // Auto-scroll to selected day in mobile slider
  useEffect(() => {
    if (scrollRef.current && selectedDay && itinerary?.days) {
      const selectedIndex = itinerary.days.findIndex((d: any) => d.id === selectedDay)
      if (selectedIndex !== -1) {
        const button = scrollRef.current.children[selectedIndex] as HTMLElement
        if (button && button.scrollIntoView) {
          button.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'center' 
          })
        }
      }
    }
  }, [selectedDay, itinerary?.days])

  const DayButton = ({ day, index }: { day: any, index: number }) => {
    const dayDate = getDayDate(itinerary.startDate, day.dayIndex || index)
    const accommodationStatus = getAccommodationStatusForDate(dayDate)
    
    return (
      <button
        key={day.id}
        onClick={() => setSelectedDay(day.id)}
        className={`flex-shrink-0 p-3 rounded-lg transition-colors md:w-full md:text-left ${
          selectedDay === day.id
            ? 'bg-ocean-blue-100 text-ocean-blue-900 border border-ocean-blue-200'
            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex md:flex-col md:space-y-1 items-center md:items-start justify-between">
          <div className="font-medium whitespace-nowrap">Day {index + 1}</div>
          
          {/* Accommodation Status Indicator */}
          <div className="flex md:justify-end md:w-full">
            {accommodationStatus.status === 'full' && (
              <Hotel 
                className="h-4 w-4 text-green-600" 
              />
            )}
            {accommodationStatus.status === 'partial' && (
              <AlertTriangle 
                className="h-4 w-4 text-orange-500" 
              />
            )}
            {accommodationStatus.status === 'none' && (
              <AlertCircle 
                className="h-4 w-4 text-amber-500" 
              />
            )}
          </div>
        </div>
        
        <div className="text-sm text-gray-600 mt-1 md:mt-0 whitespace-nowrap">
          {format(dayDate, 'MMM d')}
        </div>
        
        <div className="hidden md:flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{day.activities?.length || 0} activities</span>
          
          {/* Accommodation Status Text */}
          {accommodationStatus.status !== 'none' && (
            <span className={`${
              accommodationStatus.status === 'full' 
                ? 'text-green-600' 
                : 'text-orange-500'
            }`}>
              {accommodationStatus.totalGuests}/{accommodationStatus.memberCount} guests
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Mobile: Horizontal Slider */}
      <div className="md:hidden sticky top-0 bg-white z-10 border-b border-gray-200">
        <div 
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-4 py-4 scrollbar-hide"
        >
          {itinerary.days.map((day: any, index: number) => (
            <DayButton key={day.id} day={day} index={index} />
          ))}
        </div>
      </div>

      {/* Desktop: Left Sidebar */}
      <div className="hidden md:block w-1/3 border-r border-gray-200 p-4">
        <div className="space-y-2">
          {itinerary.days.map((day: any, index: number) => (
            <DayButton key={day.id} day={day} index={index} />
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 md:w-2/3 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDayData ? `Day ${itinerary.days.findIndex((d: any) => d.id === selectedDay) + 1} Activities` : 'Select a Day'}
            </h3>
            {selectedDayData && selectedDayDate && (
              <p className="text-sm text-gray-600">
                {format(selectedDayDate, 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => router.push(`/itinerary/${itinerary.id}/explore`)}
              className="flex items-center px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white rounded-lg transition-colors"
            >
              <Compass className="h-4 w-4 mr-2" />
              Explore
            </button>
          </div>
        </div>

        {!selectedDayData ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Select a day to view activities</p>
          </div>
        ) : selectedDayData.activities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No activities planned for this day</p>
            <button
              onClick={() => {
                // For first activity, try to use accommodation location as reference
                const accommodation = getAccommodationForDate(selectedDayData?.date)
                setAddActivityContext({
                  afterActivityId: undefined,
                  suggestedStartTime: undefined,
                  previousLocation: accommodation?.locationLat && accommodation?.locationLng
                    ? { lat: accommodation.locationLat, lng: accommodation.locationLng }
                    : undefined
                })
                setShowAddActivity(true)
              }}
              className="text-ocean-blue-600 hover:underline"
            >
              Add the first activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Start of Day Accommodation Card */}
            {(() => {
              const accommodation = getAccommodationForDate(selectedDayDate)
              const firstActivity = selectedDayData.activities[0]
              return accommodation ? (
                <AccommodationCard
                  accommodation={accommodation}
                  cardNumber={1}
                  isStart={true}
                  firstActivityStartTime={firstActivity?.startTime}
                  commuteTime={30} // Default 30 minutes, could be calculated dynamically
                />
              ) : null
            })()}

            {/* Morning Time Gap - Show before first activity if there's a meaningful time gap after commute */}
            {selectedDayData.activities.length > 0 && selectedDayData.activities[0].startTime && (() => {
              const firstActivity = selectedDayData.activities[0]
              const firstActivityTime = firstActivity.startTime
              const dayStart = '08:00'
              const commuteTimeMinutes = 30 // Default commute time from accommodation
              const bufferTimeMinutes = 15 // Buffer time for getting ready
              
              // Calculate the departure time from accommodation (first activity time - commute - buffer)
              const firstActivityDate = new Date(`2000-01-01T${firstActivityTime}`)
              const departureDate = new Date(firstActivityDate.getTime() - (commuteTimeMinutes + bufferTimeMinutes) * 60 * 1000)
              const departureTime = departureDate.toTimeString().slice(0, 5)
              
              // Calculate the available gap between day start and departure time
              const dayStartDate = new Date(`2000-01-01T${dayStart}`)
              const gapMinutes = Math.floor((departureDate.getTime() - dayStartDate.getTime()) / (1000 * 60))
              
              // Only show if there's at least 60 minutes gap after accounting for commute
              if (gapMinutes >= 60) {
                return (
                  <TimeGap
                    startTime={dayStart}
                    endTime={departureTime}
                    gapType="morning"
                    onAddActivity={(suggestedStartTime?: string) => {
                      setAddActivityContext({
                        suggestedStartTime,
                        previousLocation: getAccommodationForDate(selectedDayDate) && 
                          getAccommodationForDate(selectedDayDate).locationLat && 
                          getAccommodationForDate(selectedDayDate).locationLng
                          ? { 
                              lat: getAccommodationForDate(selectedDayDate).locationLat, 
                              lng: getAccommodationForDate(selectedDayDate).locationLng 
                            }
                          : undefined
                      })
                      setShowAddActivity(true)
                    }}
                  />
                )
              }
              return null
            })()}

            {/* Full Day Availability - Show when no activities exist */}
            {selectedDayData.activities.length === 0 && (
              <TimeGap
                startTime="08:00"
                endTime="22:00"
                gapLabel="Full day availability"
                onAddActivity={(suggestedStartTime?: string) => {
                  setAddActivityContext({
                    suggestedStartTime,
                    previousLocation: getAccommodationForDate(selectedDayData.date) && 
                      getAccommodationForDate(selectedDayData.date).locationLat && 
                      getAccommodationForDate(selectedDayData.date).locationLng
                      ? { 
                          lat: getAccommodationForDate(selectedDayData.date).locationLat, 
                          lng: getAccommodationForDate(selectedDayData.date).locationLng 
                        }
                      : undefined
                  })
                  setShowAddActivity(true)
                }}
              />
            )}

            {selectedDayData.activities.map((activity: any, index: number) => {
              const accommodation = getAccommodationForDate(selectedDayDate)
              const isFirstActivity = index === 0
              const isLastActivity = index === selectedDayData.activities.length - 1
              
              return (
                <div key={activity.id}>
                  {/* Accommodation to First Activity Commute */}
                  {isFirstActivity && accommodation && activity.location && (
                    <Commute
                      fromLocation={accommodation.location}
                      toLocation={activity.location}
                      isAccommodationCommute={true}
                      commuteType="start"
                    />
                  )}
                  
                  <ActivityItem
                    activity={activity}
                    activityNumber={index + 2}
                    session={session}
                    onVote={handleVote}
                    onToggleComments={handleToggleComments}
                    onAddComment={handleAddComment}
                    onEditActivity={setEditingActivity}
                    onDeleteActivity={handleDeleteActivity}
                    showComments={showComments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    isSubmittingComment={isSubmittingComment}
                    isAdmin={isAdmin}
                    openDropdown={openDropdown}
                    setOpenDropdown={setOpenDropdown}
                  />
                  
                  {/* Show Commute and TimeGap between activities */}
                  {index < selectedDayData.activities.length - 1 && (
                    <>
                      {/* Always show commute between activities */}
                      <Commute
                        fromLocation={activity.location || undefined}
                        toLocation={selectedDayData.activities[index + 1].location || undefined}
                      />
                      
                      {/* Show TimeGap only if there's a significant time gap */}
                      <TimeGap
                        startTime={getEndTime(activity.startTime, activity.duration) || undefined}
                        endTime={selectedDayData.activities[index + 1].startTime || undefined}
                        onAddActivity={(suggestedStartTime?: string) => {
                          setAddActivityContext({
                            afterActivityId: activity.id,
                            suggestedStartTime,
                            previousLocation: activity.locationLat && activity.locationLng 
                              ? { lat: activity.locationLat, lng: activity.locationLng }
                              : undefined
                          })
                          setShowAddActivity(true)
                        }}
                      />
                    </>
                  )}
                  
                  {/* Last Activity to Accommodation Commute */}
                  {isLastActivity && accommodation && activity.location && (
                    <Commute
                      fromLocation={activity.location}
                      toLocation={accommodation.location}
                      isAccommodationCommute={true}
                      commuteType="end"
                    />
                  )}
                </div>
              )
            })}

            {/* Evening Time Gap - Show after last activity if there's meaningful time gap after commute */}
            {selectedDayData.activities.length > 0 && (() => {
              const lastActivity = selectedDayData.activities[selectedDayData.activities.length - 1]
              const lastActivityEndTime = getEndTime(lastActivity.startTime, lastActivity.duration)
              const dayEnd = '22:00'
              const commuteTimeMinutes = 30 // Default commute time back to accommodation
              const bufferTimeMinutes = 15 // Buffer time for returning to accommodation
              
              if (!lastActivityEndTime) return null
              
              // Calculate the latest start time for a new activity (day end - commute - buffer)
              const dayEndDate = new Date(`2000-01-01T${dayEnd}`)
              const latestStartDate = new Date(dayEndDate.getTime() - (commuteTimeMinutes + bufferTimeMinutes) * 60 * 1000)
              const latestStartTime = latestStartDate.toTimeString().slice(0, 5)
              
              // Calculate the available gap between last activity end and latest possible start
              const lastActivityEndDate = new Date(`2000-01-01T${lastActivityEndTime}`)
              const gapMinutes = Math.floor((latestStartDate.getTime() - lastActivityEndDate.getTime()) / (1000 * 60))
              
              // Only show if there's at least 60 minutes gap after accounting for commute
              if (gapMinutes >= 60) {
                return (
                  <TimeGap
                    startTime={lastActivityEndTime}
                    endTime={latestStartTime}
                    gapType="evening"
                    onAddActivity={(suggestedStartTime?: string) => {
                      setAddActivityContext({
                        afterActivityId: lastActivity.id,
                        suggestedStartTime,
                        previousLocation: lastActivity.locationLat && lastActivity.locationLng 
                          ? { lat: lastActivity.locationLat, lng: lastActivity.locationLng }
                          : undefined
                      })
                      setShowAddActivity(true)
                    }}
                  />
                )
              }
              return null
            })()}

            {/* End of Day Accommodation Card */}
            {(() => {
              const accommodation = getAccommodationForDate(selectedDayDate)
              const totalActivities = selectedDayData.activities.length
              return accommodation ? (
                <AccommodationCard
                  accommodation={accommodation}
                  cardNumber={totalActivities + 2}
                  isEnd={true}
                />
              ) : null
            })()}
          </div>
        )}
      </div>

      {/* Mobile & Mid-size: Floating Show on Map Button */}
      <button
        onClick={() => setShowMap(true)}
        className="xl:hidden fixed bottom-6 right-6 z-20 flex items-center px-4 py-3 bg-ocean-blue-600 hover:bg-ocean-blue-700 text-white rounded-full shadow-lg transition-colors"
      >
        <Map className="h-5 w-5 mr-2" />
        Show on Map
      </button>
    </div>
  )
}