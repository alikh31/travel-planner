'use client'

import { format } from 'date-fns'
import { Calendar, Plus, Map, Hotel, AlertCircle, AlertTriangle } from 'lucide-react'
import AccommodationCard from './AccommodationCard'
import Commute from './Commute'

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
  getTimeWithOffset,
  getEndTime,
  TimeGap
}: DaysAndActivitiesProps) {
  return (
    <div className="flex h-full">
      {/* Days List - Left Side */}
      <div className="w-1/3 border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Days</h3>
        <div className="space-y-2">
          {itinerary.days.map((day: any, index: number) => {
            const accommodationStatus = getAccommodationStatusForDate(day.date)
            
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedDay === day.id
                    ? 'bg-ocean-blue-100 text-ocean-blue-900 border border-ocean-blue-200'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">Day {index + 1}</div>
                  
                  {/* Accommodation Status Indicator */}
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
                
                <div className="text-sm text-gray-600">
                  {format(new Date(day.date), 'MMM d, yyyy')}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
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
          })}
        </div>
      </div>

      {/* Activities List - Right Side */}
      <div className="w-2/3 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedDayData ? `Day ${itinerary.days.findIndex((d: any) => d.id === selectedDay) + 1} Activities` : 'Select a Day'}
            </h3>
            {selectedDayData && (
              <p className="text-sm text-gray-600">
                {format(new Date(selectedDayData.date), 'EEEE, MMMM d, yyyy')}
              </p>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setShowMap(true)}
              className="xl:hidden flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Map className="h-4 w-4 mr-2" />
              Show on Map
            </button>
            <button
              onClick={() => setShowAddActivity(true)}
              className="flex items-center px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
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
              onClick={() => setShowAddActivity(true)}
              className="text-ocean-blue-600 hover:underline"
            >
              Add the first activity
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Start of Day Accommodation Card */}
            {(() => {
              const accommodation = getAccommodationForDate(selectedDayData.date)
              return accommodation ? (
                <AccommodationCard
                  accommodation={accommodation}
                  cardNumber={1}
                  isStart={true}
                />
              ) : null
            })()}

            {selectedDayData.activities.map((activity: any, index: number) => {
              const accommodation = getAccommodationForDate(selectedDayData.date)
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
                        onAddActivity={() => {
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

            {/* End of Day Accommodation Card */}
            {(() => {
              const accommodation = getAccommodationForDate(selectedDayData.date)
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
    </div>
  )
}