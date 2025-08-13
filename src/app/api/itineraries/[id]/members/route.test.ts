// Mock dependencies BEFORE any imports - next-auth mocked globally
jest.mock('../../../../../lib/auth', () => ({
  authOptions: {},
}))

// Mock Prisma with jest.fn() created inside the factory
jest.mock('../../../../../lib/prisma', () => ({
  prisma: {
    itinerary: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    groupMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

// Now import everything
import { POST, DELETE, PUT } from './route'
import { getServerSession } from 'next-auth'
import { NextRequest } from 'next/server'

// Import the mocked prisma to get access to mock functions
import { prisma } from '../../../../../lib/prisma'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockItineraryFindFirst = prisma.itinerary.findFirst as jest.MockedFunction<any>
const mockUserFindUnique = prisma.user.findUnique as jest.MockedFunction<any>
const mockGroupMemberFindFirst = prisma.groupMember.findFirst as jest.MockedFunction<any>
const mockGroupMemberCreate = prisma.groupMember.create as jest.MockedFunction<any>
const mockGroupMemberDeleteMany = prisma.groupMember.deleteMany as jest.MockedFunction<any>
const mockGroupMemberUpdateMany = prisma.groupMember.updateMany as jest.MockedFunction<any>

describe('/api/itineraries/[id]/members', () => {
  const mockSession = {
    user: { id: 'admin-user-id', name: 'Admin User', email: 'admin@example.com' }
  }

  const mockItinerary = {
    id: 'itinerary-1',
    title: 'Test Itinerary',
    createdBy: 'admin-user-id',
    members: [
      { userId: 'admin-user-id', role: 'admin' }
    ]
  }

  const mockUser = {
    id: 'new-user-id',
    name: 'New User',
    email: 'new@example.com'
  }

  const mockMember = {
    id: 'member-1',
    itineraryId: 'itinerary-1',
    userId: 'new-user-id',
    role: 'member',
    user: mockUser
  }

  const mockContext = {
    params: Promise.resolve({ id: 'itinerary-1' })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
    mockItineraryFindFirst.mockResolvedValue(mockItinerary)
    mockUserFindUnique.mockResolvedValue(mockUser)
    mockGroupMemberFindFirst.mockResolvedValue(null)
    mockGroupMemberCreate.mockResolvedValue(mockMember)
  })

  describe('POST - Add Member', () => {
    it('adds member successfully', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          role: 'member'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockMember)
      expect(mockGroupMemberCreate).toHaveBeenCalledWith({
        data: {
          itineraryId: 'itinerary-1',
          userId: 'new-user-id',
          role: 'member',
        },
        include: {
          user: true,
        },
      })
    })

    it('returns 401 for unauthenticated users', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com',
          role: 'member'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 400 for missing email', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          role: 'member'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('returns 404 for non-existent itinerary', async () => {
      mockItineraryFindFirst.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Itinerary not found or insufficient permissions')
    })

    it('returns 404 for non-existent user', async () => {
      mockUserFindUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User with this email not found')
    })

    it('returns 400 for existing member', async () => {
      mockGroupMemberFindFirst.mockResolvedValue({
        id: 'existing-member',
        itineraryId: 'itinerary-1',
        userId: 'new-user-id'
      })

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com'
        })
      })

      const response = await POST(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User is already a member of this itinerary')
    })

    it('uses default role when not specified', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'POST',
        body: JSON.stringify({
          email: 'new@example.com'
        })
      })

      await POST(request, mockContext)

      expect(mockGroupMemberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'member'
          })
        })
      )
    })
  })

  describe('DELETE - Remove Member', () => {
    it('removes member successfully', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members?userId=member-user-id', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Member removed successfully')
      expect(mockGroupMemberDeleteMany).toHaveBeenCalledWith({
        where: {
          itineraryId: 'itinerary-1',
          userId: 'member-user-id',
        },
      })
    })

    it('returns 400 for missing userId', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('prevents removal of creator', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members?userId=admin-user-id', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot remove the creator of the itinerary')
    })

    it('allows self-removal by non-admin', async () => {
      const memberSession = {
        user: { id: 'member-user-id', name: 'Member User', email: 'member@example.com' }
      }
      mockGetServerSession.mockResolvedValue(memberSession as any)

      // Mock itinerary access for member removing themselves
      mockItineraryFindFirst.mockResolvedValue({
        ...mockItinerary,
        members: [
          { userId: 'admin-user-id', role: 'admin' },
          { userId: 'member-user-id', role: 'member' }
        ]
      })

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members?userId=member-user-id', {
        method: 'DELETE'
      })

      const response = await DELETE(request, mockContext)

      expect(response.status).toBe(200)
    })
  })

  describe('PUT - Update Member Role', () => {
    it('updates member role successfully', async () => {
      mockGroupMemberUpdateMany.mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'member-user-id',
          role: 'admin'
        })
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Member role updated successfully')
      expect(mockGroupMemberUpdateMany).toHaveBeenCalledWith({
        where: {
          itineraryId: 'itinerary-1',
          userId: 'member-user-id',
        },
        data: { role: 'admin' },
      })
    })

    it('returns 400 for invalid role', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'member-user-id',
          role: 'invalid-role'
        })
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Role must be "admin" or "member"')
    })

    it('prevents changing creator role', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'admin-user-id',
          role: 'member'
        })
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot change the role of the creator')
    })

    it('returns 404 for non-existent member', async () => {
      mockGroupMemberUpdateMany.mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'non-existent-user',
          role: 'admin'
        })
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Member not found')
    })

    it('returns 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
        method: 'PUT',
        body: JSON.stringify({
          userId: 'member-user-id'
          // Missing role
        })
      })

      const response = await PUT(request, mockContext)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('User ID and role are required')
    })
  })

  it('handles database errors gracefully', async () => {
    mockGroupMemberCreate.mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost/api/itineraries/itinerary-1/members', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new@example.com'
      })
    })

    const response = await POST(request, mockContext)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to add member')
  })
})