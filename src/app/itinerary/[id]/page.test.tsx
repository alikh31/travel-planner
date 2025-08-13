import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import ItineraryPage from './page'

// Mock fetch
global.fetch = jest.fn()

// Mock the useSession hook
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock the useParams hook
const mockUseParams = useParams as jest.MockedFunction<typeof useParams>

// Mock data
const mockItinerary = {
  id: 'test-id',
  title: 'Test Itinerary',
  description: 'Test Description',
  startDate: '2024-01-01',
  endDate: '2024-01-05',
  accommodation: 'Test Hotel',
  accommodationAddress: '123 Test St',
  createdBy: 'test-user-id',
  members: [
    {
      id: 'member-1',
      role: 'admin',
      user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
    }
  ],
  days: [
    {
      id: 'day-1',
      date: '2024-01-01',
      activities: [
        {
          id: 'activity-1',
          title: 'Test Activity',
          description: 'Test Description',
          location: 'Test Location',
          locationLat: 40.7128,
          locationLng: -74.0060,
          startTime: '10:00',
          duration: 120,
          cost: 50,
          createdBy: 'test-user-id',
          creator: { id: 'test-user-id', name: 'Test User' },
          suggestions: [],
          votes: []
        }
      ]
    }
  ],
  comments: []
}

describe('ItineraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' }
      },
      status: 'authenticated'
    } as any)
    
    mockUseParams.mockReturnValue({ id: 'test-id' })
    
    // Mock successful API responses
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockItinerary,
    } as Response)
  })

  it('renders itinerary page with loading state initially', async () => {
    render(<ItineraryPage />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders itinerary data after loading', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Itinerary')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Test Hotel')).toBeInTheDocument()
  })

  it('displays activities correctly', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Activity')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Test Location')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
  })

  it('shows add activity button for authorized users', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Itinerary')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Add Activity')).toBeInTheDocument()
  })

  it('handles add activity modal opening', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Itinerary')).toBeInTheDocument()
    })
    
    const addActivityButton = screen.getByText('Add Activity')
    fireEvent.click(addActivityButton)
    
    await waitFor(() => {
      expect(screen.getByText('Add New Activity')).toBeInTheDocument()
    })
  })

  it('displays live status indicator', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument()
    })
  })

  it('handles error states', async () => {
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Itinerary not found' }),
    } as Response)
    
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Itinerary not found')).toBeInTheDocument()
    })
  })

  it('handles unauthorized access', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    } as any)
    
    render(<ItineraryPage />)
    
    expect(screen.getByText('Please sign in to view this itinerary')).toBeInTheDocument()
  })

  it('polls for updates every 5 seconds', async () => {
    jest.useFakeTimers()
    
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Itinerary')).toBeInTheDocument()
    })
    
    // Clear the initial fetch call
    jest.clearAllMocks()
    
    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/itineraries/test-id')
    })
    
    jest.useRealTimers()
  })

  it('handles accommodation booking status', async () => {
    const itineraryWithBooking = {
      ...mockItinerary,
      accommodationBooked: true
    }
    
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => itineraryWithBooking,
    } as Response)
    
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('✓ Booked')).toBeInTheDocument()
    })
  })

  it('handles activity creation', async () => {
    render(<ItineraryPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Itinerary')).toBeInTheDocument()
    })
    
    const addActivityButton = screen.getByText('Add Activity')
    fireEvent.click(addActivityButton)
    
    await waitFor(() => {
      expect(screen.getByText('Add New Activity')).toBeInTheDocument()
    })
    
    // Mock successful activity creation
    ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'new-activity',
        title: 'New Activity',
        dayId: 'day-1'
      }),
    } as Response)
    
    const titleInput = screen.getByPlaceholderText('Activity title')
    fireEvent.change(titleInput, { target: { value: 'New Activity' } })
    
    const submitButton = screen.getByText('Add Activity')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/activities', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('New Activity')
      }))
    })
  })
})