'use client'

import { useState, useEffect, use } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  UserPlus, 
  Mail, 
  Crown,
  UserMinus,
  Loader2
} from 'lucide-react'
import TripHeader from '@/components/TripHeader'
import AddMemberModal from '@/components/AddMemberModal'

interface Member {
  id: string
  role: string
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

interface Itinerary {
  id: string
  title: string
  destination: string
  startDate: string
  endDate: string
  createdBy: string
  members: Member[]
}

export default function MembersPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const resolvedParams = use(params)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    fetchItinerary()
  }, [resolvedParams.id, fetchItinerary])

  const fetchItinerary = async () => {
    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}`)
      if (response.ok) {
        const data = await response.json()
        setItinerary(data)
      } else {
        console.error('Failed to fetch itinerary')
      }
    } catch (error) {
      console.error('Error fetching itinerary:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !itinerary) return

    setIsAddingMember(true)
    try {
      const response = await fetch(`/api/itineraries/${itinerary.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail.trim() })
      })

      if (response.ok) {
        await fetchItinerary()
        setNewMemberEmail('')
        setShowAddMember(false)
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


  const isAdmin = session?.user?.id ? 
    itinerary?.members?.some(m => m.user.email === session.user.email && m.role === 'ADMIN') || 
    itinerary?.createdBy === session.user.id : false

  const updateMemberRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
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
        await fetchItinerary()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update member role')
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      alert('Failed to update member role')
    }
  }

  const removeMember = async (userId: string) => {
    if (!session?.user?.id || !isAdmin) {
      alert('You do not have permission to remove members.')
      return
    }
    
    if (!confirm('Are you sure you want to remove this member? They will lose access to this itinerary.')) return

    setRemovingMemberId(userId)
    try {
      const response = await fetch(`/api/itineraries/${resolvedParams.id}/members?userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchItinerary()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      alert('Failed to remove member')
    } finally {
      setRemovingMemberId(null)
    }
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-ocean-blue-600" />
      </div>
    )
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-stone-gray-900 mb-2">Itinerary not found</h2>
          <Link href="/" className="text-ocean-blue-600 hover:text-ocean-blue-500">
            Return to home
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
        currentPage="members"
        backUrl={`/itinerary/${resolvedParams.id}`}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-gray-900 mb-2">Manage Members</h1>
          <p className="text-stone-gray-600">
            {itinerary.title} • {itinerary.destination}
          </p>
        </div>

        {/* Add Member Section */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm border border-stone-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-gray-900">Add New Member</h2>
                <p className="text-sm text-stone-gray-600 mt-1">
                  Invite someone to join this itinerary
                </p>
              </div>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sunset-coral-600 text-white rounded-lg hover:bg-sunset-coral-700 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Add Member
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white rounded-lg shadow-sm border border-stone-gray-200">
          <div className="px-6 py-4 border-b border-stone-gray-200">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-stone-gray-400" />
              <h2 className="text-lg font-semibold text-stone-gray-900">
                Trip Members ({itinerary.members.length})
              </h2>
            </div>
          </div>

          <div className="divide-y divide-stone-gray-200">
            {itinerary.members.map(member => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-start gap-4">
                  {/* Avatar Section */}
                  <div className="flex-shrink-0">
                    {member.user.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || 'Member'}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ocean-blue-500 to-sky-aqua-600 flex items-center justify-center text-white font-semibold text-lg">
                        {member.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-stone-gray-900">
                            {member.user.name || 'Unknown User'}
                          </h3>
                          {member.role === 'ADMIN' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-golden-sand-100 text-golden-sand-800">
                              <Crown className="h-3 w-3" />
                              Admin
                            </span>
                          )}
                          {member.user.email === session?.user?.email && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ocean-blue-100 text-ocean-blue-800">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-stone-gray-600 mb-2">
                          <Mail className="h-4 w-4" />
                          {member.user.email}
                        </div>
                        <div className="text-sm text-stone-gray-500">
                          Member since joining this trip
                        </div>
                      </div>

                      {isAdmin && member.user.email !== session?.user?.email && (
                        <div className="flex items-center gap-2 ml-4">
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.user.id, e.target.value as 'ADMIN' | 'MEMBER')}
                            className="text-xs border border-stone-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ocean-blue-500 bg-white"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          <button
                            onClick={() => removeMember(member.user.id)}
                            disabled={removingMemberId === member.user.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sunset-coral-600 hover:bg-sunset-coral-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {removingMemberId === member.user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Permissions Info */}
        {!isAdmin && (
          <div className="mt-6 bg-ocean-blue-50 border border-ocean-blue-200 rounded-lg p-4">
            <p className="text-sm text-ocean-blue-800">
              Only administrators can add or remove members from this itinerary.
            </p>
          </div>
        )}
      </main>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => {
          setShowAddMember(false)
          setNewMemberEmail('')
        }}
        newMemberEmail={newMemberEmail}
        setNewMemberEmail={setNewMemberEmail}
        onSubmit={(e) => {
          e.preventDefault()
          handleAddMember()
        }}
        isAddingMember={isAddingMember}
      />
    </div>
  )
}