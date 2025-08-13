'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, X, Crown, Trash2, RefreshCw } from 'lucide-react'
import Image from 'next/image'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface Member {
  id: string
  role: string
  user: User
}

interface Session {
  user: User
}

interface Itinerary {
  id: string
  title: string
  destination?: string
  description?: string
  startDate: string
  endDate: string
  accommodation?: string
  accommodationAddress?: string
  createdBy: string
  members: Member[]
}

interface TripHeaderProps {
  itinerary: Itinerary
  session: Session
  isAdmin: boolean
  showMembers: boolean
  setShowMembers: (show: boolean) => void
  setShowAddMember: (show: boolean) => void
  updateMemberRole: (userId: string, role: 'admin' | 'member') => void
  removeMember: (userId: string) => void
  isRefreshing?: boolean
}

export default function TripHeader({
  itinerary,
  session,
  isAdmin,
  showMembers,
  setShowMembers,
  setShowAddMember,
  updateMemberRole,
  removeMember,
  isRefreshing = false
}: TripHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">{itinerary.title}</h1>
                <div className="ml-2 flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></div>
                  Live
                </div>
              </div>
              <p className="text-sm text-gray-600">{itinerary.destination}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isRefreshing && (
              <div className="flex items-center text-xs text-gray-500">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </div>
            )}
            <button
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-4 w-4 mr-2" />
              Members ({itinerary.members?.length || 0})
            </button>
            
            {session && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>Welcome, {session.user?.name}</span>
                {session.user?.image && (
                  <Image
                    src={session.user.image}
                    alt="Profile"
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full border border-gray-200"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Members Panel */}
        {showMembers && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Trip Members</h3>
              <button
                onClick={() => setShowMembers(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {itinerary.members.map((member: Member) => (
                <div key={member.user.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={member.user.image || '/default-avatar.png'}
                      alt={member.user.name || 'User'}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{member.user.name}</span>
                        {member.role === 'admin' && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                        {itinerary.createdBy === member.user.id && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            Creator
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                  </div>
                  
                  {/* Admin actions */}
                  {isAdmin && itinerary.createdBy !== member.user.id && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateMemberRole(member.user.id, e.target.value as 'admin' | 'member')}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        onClick={() => removeMember(member.user.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Add member section */}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddMember(true)}
                  className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Member
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}