'use client'

import LocationSearch from './LocationSearch'

interface NewActivity {
  title: string
  description: string
  location: string
  locationPlaceId: string
  locationLat: number | null
  locationLng: number | null
  startTime: string
  duration: string
  cost: string
  isGroupActivity: boolean
}

interface AddActivityModalProps {
  isOpen: boolean
  onClose: () => void
  newActivity: NewActivity
  setNewActivity: (updater: (prev: NewActivity) => NewActivity) => void
  onSubmit: (e: React.FormEvent) => void
}

export default function AddActivityModal({
  isOpen,
  onClose,
  newActivity,
  setNewActivity,
  onSubmit
}: AddActivityModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Activity</h3>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <LocationSearch
              value={newActivity.location}
              onChange={(location, placeData) => {
                setNewActivity(prev => ({
                  ...prev,
                  location,
                  locationPlaceId: placeData?.place_id || '',
                  locationLat: placeData?.geometry?.location?.lat || null,
                  locationLng: placeData?.geometry?.location?.lng || null,
                  // Pre-fill title with place name if title is empty and place is selected
                  title: !prev.title.trim() && placeData?.name ? placeData.name : prev.title
                }))
              }}
              placeholder="Search for a location..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={newActivity.title}
              onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newActivity.description}
              onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={newActivity.startTime}
                onChange={(e) => setNewActivity(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={newActivity.duration}
                onChange={(e) => setNewActivity(prev => ({ ...prev, duration: e.target.value }))}
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
              value={newActivity.cost}
              onChange={(e) => setNewActivity(prev => ({ ...prev, cost: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isGroupActivity"
              checked={newActivity.isGroupActivity}
              onChange={(e) => setNewActivity(prev => ({ ...prev, isGroupActivity: e.target.checked }))}
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
              className="px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 text-white rounded-lg transition-colors"
            >
              Add Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}