'use client'

import { useState, useEffect } from 'react'
import LocationSearch from './LocationSearch'

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

interface EditActivityModalProps {
  isOpen: boolean
  onClose: () => void
  activity: Activity | null
  onSubmit: (updatedActivity: Activity) => void
}

export default function EditActivityModal({
  isOpen,
  onClose,
  activity,
  onSubmit
}: EditActivityModalProps) {
  const [editedActivity, setEditedActivity] = useState<Activity>({
    id: '',
    title: '',
    description: '',
    location: '',
    locationPlaceId: '',
    locationLat: null,
    locationLng: null,
    startTime: '',
    duration: 0,
    cost: 0,
    isGroupActivity: true,
    createdBy: '',
    creator: null,
    suggestions: [],
    votes: [],
    comments: []
  })

  // Update local state when activity prop changes
  useEffect(() => {
    if (activity) {
      setEditedActivity({
        id: activity.id,
        title: activity.title || '',
        description: activity.description || '',
        location: activity.location || '',
        locationPlaceId: activity.locationPlaceId || '',
        locationLat: activity.locationLat || null,
        locationLng: activity.locationLng || null,
        startTime: activity.startTime || '',
        duration: activity.duration || 0,
        cost: activity.cost || 0,
        isGroupActivity: activity.isGroupActivity,
        createdBy: activity.createdBy,
        creator: activity.creator,
        suggestions: activity.suggestions,
        votes: activity.votes,
        comments: activity.comments
      })
    }
  }, [activity])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editedActivity) {
      onSubmit(editedActivity)
    }
  }

  if (!isOpen || !activity) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Activity</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <LocationSearch
              value={editedActivity.location || ''}
              onChange={(location, placeData) => {
                setEditedActivity(prev => ({
                  ...prev,
                  location,
                  locationPlaceId: placeData?.place_id || '',
                  locationLat: placeData?.geometry?.location?.lat || null,
                  locationLng: placeData?.geometry?.location?.lng || null,
                }))
              }}
              placeholder="Search for a location..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={editedActivity.title}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={editedActivity.description || ''}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={editedActivity.startTime || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={editedActivity.duration || ''}
                onChange={(e) => setEditedActivity(prev => ({ ...prev, duration: Number(e.target.value) || 0 }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={editedActivity.cost || ''}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, cost: Number(e.target.value) || 0 }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGroupActivity"
              checked={editedActivity.isGroupActivity}
              onChange={(e) => setEditedActivity(prev => ({ ...prev, isGroupActivity: e.target.checked }))}
              className="h-4 w-4 text-ocean-blue-600 focus:ring-ocean-blue-500 border-stone-gray-300 rounded"
            />
            <label htmlFor="isGroupActivity" className="ml-2 text-sm text-gray-700">
              Group activity (everyone participates)
            </label>
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
              className="px-4 py-2 bg-ocean-blue-600 hover:bg-ocean-blue-700 text-white rounded-lg transition-colors"
            >
              Update Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}