import { POST } from './route'
import { getServerSession } from 'next-auth'

// Mock dependencies
jest.mock('next-auth')
jest.mock('../../../lib/prisma', () => ({
  prisma: {
    day: {
      findFirst: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
  },
}))

// Import after mock
const { prisma } = require('../../../lib/prisma')
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrismaDay = prisma.day as any
const mockPrismaActivity = prisma.activity as any

describe('/api/activities POST', () => {
  const mockSession = {
    user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
  }

  const mockDay = {
    id: 'day-1',
    date: '2024-01-01',
    itinerary: {
      id: 'itinerary-1',
      members: [
        { userId: 'test-user-id', role: 'admin' }
      ]
    }
  }

  const mockActivity = {
    id: 'activity-1',
    dayId: 'day-1',
    title: 'Test Activity',
    description: 'Test Description',
    location: 'Test Location',
    locationPlaceId: 'place-123',
    locationLat: 40.7128,
    locationLng: -74.0060,
    startTime: '10:00',
    duration: 120,
    cost: 50,
    isGroupActivity: true,
    createdBy: 'test-user-id',
    creator: { id: 'test-user-id', name: 'Test User' },
    suggestions: [],
    votes: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession as any)
    mockPrismaDay.findFirst.mockResolvedValue(mockDay)
    mockPrismaActivity.create.mockResolvedValue(mockActivity)
  })

  it('creates activity successfully', async () => {
    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
        description: 'Test Description',
        location: 'Test Location',
        locationPlaceId: 'place-123',
        locationLat: 40.7128,
        locationLng: -74.0060,
        startTime: '10:00',
        duration: 120,
        cost: 50,
        isGroupActivity: true
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockActivity)
    expect(mockPrismaActivity.create).toHaveBeenCalledWith({
      data: {
        dayId: 'day-1',
        title: 'Test Activity',
        description: 'Test Description',
        location: 'Test Location',
        locationPlaceId: 'place-123',
        locationLat: 40.7128,
        locationLng: -74.0060,
        startTime: '10:00',
        duration: 120,
        cost: 50,
        isGroupActivity: true,
        createdBy: 'test-user-id',
      },
      include: {
        creator: true,
        suggestions: {
          include: {
            suggester: true,
            votes: true,
          },
        },
        votes: true,
      },
    })
  })

  it('returns 401 for unauthenticated users', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 for missing required fields', async () => {
    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing dayId and title
        description: 'Test Description',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Day ID and title are required')
  })

  it('returns 404 for non-existent day', async () => {
    mockPrismaDay.findFirst.mockResolvedValue(null)

    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'non-existent-day',
        title: 'Test Activity',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Day not found or access denied')
  })

  it('returns 404 for unauthorized day access', async () => {
    const unauthorizedDay = {
      ...mockDay,
      itinerary: {
        ...mockDay.itinerary,
        members: [
          { userId: 'other-user-id', role: 'admin' }
        ]
      }
    }
    mockPrismaDay.findFirst.mockResolvedValue(null) // Prisma query with userId filter returns null

    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Day not found or access denied')
  })

  it('handles activity creation with minimal data', async () => {
    const minimalActivity = {
      id: 'activity-2',
      dayId: 'day-1',
      title: 'Minimal Activity',
      description: null,
      location: null,
      locationPlaceId: null,
      locationLat: null,
      locationLng: null,
      startTime: null,
      duration: null,
      cost: null,
      isGroupActivity: true,
      createdBy: 'test-user-id',
      creator: { id: 'test-user-id', name: 'Test User' },
      suggestions: [],
      votes: []
    }
    mockPrismaActivity.create.mockResolvedValue(minimalActivity)

    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Minimal Activity',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(minimalActivity)
    expect(mockPrismaActivity.create).toHaveBeenCalledWith({
      data: {
        dayId: 'day-1',
        title: 'Minimal Activity',
        description: null,
        location: null,
        locationPlaceId: null,
        locationLat: null,
        locationLng: null,
        startTime: null,
        duration: null,
        cost: null,
        isGroupActivity: true,
        createdBy: 'test-user-id',
      },
      include: {
        creator: true,
        suggestions: {
          include: {
            suggester: true,
            votes: true,
          },
        },
        votes: true,
      },
    })
  })

  it('handles database errors', async () => {
    mockPrismaActivity.create.mockRejectedValue(new Error('Database error'))

    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create activity')
  })

  it('validates day access with proper Prisma query', async () => {
    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
      })
    })

    await POST(request)

    expect(mockPrismaDay.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'day-1',
        itinerary: {
          members: {
            some: {
              userId: 'test-user-id',
            },
          },
        },
      },
    })
  })

  it('handles isGroupActivity default value', async () => {
    const request = new Request('http://localhost/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayId: 'day-1',
        title: 'Test Activity',
        isGroupActivity: false
      })
    })

    await POST(request)

    expect(mockPrismaActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isGroupActivity: false
        })
      })
    )
  })
})