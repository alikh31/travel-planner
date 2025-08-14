'use client'

import { X } from 'lucide-react'

interface AddMemberModalProps {
  isOpen: boolean
  onClose: () => void
  newMemberEmail: string
  setNewMemberEmail: (email: string) => void
  isAddingMember: boolean
  onSubmit: (e: React.FormEvent) => void
}

export default function AddMemberModal({
  isOpen,
  onClose,
  newMemberEmail,
  setNewMemberEmail,
  isAddingMember,
  onSubmit
}: AddMemberModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Member to Trip</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Enter member's email"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
              disabled={isAddingMember}
              className="px-4 py-2 bg-sunset-coral-600 hover:bg-sunset-coral-700 disabled:bg-sunset-coral-300 text-white rounded-lg transition-colors"
            >
              {isAddingMember ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}