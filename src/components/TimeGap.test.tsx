import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeGap from './TimeGap'

// Mock Google Maps module
jest.mock('../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn(),
  getPlacePhoto: jest.fn().mockResolvedValue('mock-photo-url'),
}))

const { loadGoogleMaps } = require('../lib/googleMaps')
const mockLoadGoogleMaps = loadGoogleMaps as jest.MockedFunction<typeof loadGoogleMaps>

describe('TimeGap', () => {
  const mockProps = {
    startTime: '10:00',
    endTime: '12:00',
    fromLocation: 'Museum of Art, New York',
    toLocation: 'Central Park, New York',
    onAddActivity: jest.fn(),
  }

  const mockGoogleMaps = {
    DistanceMatrixService: jest.fn(() => ({
      getDistanceMatrix: jest.fn((request, callback) => {
        callback({
          rows: [{
            elements: [{
              status: 'OK',
              duration: { text: '15 mins' },
              distance: { text: '1.2 km' }
            }]
          }]
        }, 'OK')
      }),
    })),
    DirectionsService: jest.fn(() => ({
      route: jest.fn((request, callback) => {
        callback({
          routes: [{
            legs: [{
              duration: { text: '15 mins' },
              distance: { text: '1.2 km' },
              steps: [
                {
                  travel_mode: 'WALKING',
                  instructions: 'Walk to subway station',
                  duration: { text: '5 mins' },
                  distance: { text: '0.4 km' }
                },
                {
                  travel_mode: 'TRANSIT',
                  instructions: 'Take the 6 train',
                  duration: { text: '8 mins' },
                  distance: { text: '0.6 km' },
                  transit: {
                    line: { 
                      short_name: '6', 
                      name: '6 Train',
                      vehicle: { type: 'SUBWAY' }
                    },
                    departure_stop: { name: '59th St' },
                    arrival_stop: { name: '86th St' },
                    departure_time: { text: '10:15am' },
                    arrival_time: { text: '10:23am' },
                    num_stops: 3
                  }
                }
              ]
            }]
          }]
        }, 'OK')
      }),
    })),
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      TRANSIT: 'TRANSIT',
      BICYCLING: 'BICYCLING',
    },
    DistanceMatrixStatus: { OK: 'OK' },
    DirectionsStatus: { OK: 'OK' },
    UnitSystem: { METRIC: 'METRIC' },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock loadGoogleMaps to return a properly structured google object
    mockLoadGoogleMaps.mockResolvedValue({
      maps: mockGoogleMaps
    } as any)
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'transit'),
        setItem: jest.fn(),
      },
      writable: true,
    })
    
    // Mock window.dispatchEvent
    Object.defineProperty(window, 'dispatchEvent', {
      value: jest.fn(),
      writable: true,
    })
  })

  it('renders time gap information', () => {
    render(<TimeGap {...mockProps} />)
    
    expect(screen.getByText('2h gap')).toBeInTheDocument()
  })

  it('renders add activity button', () => {
    render(<TimeGap {...mockProps} />)
    
    const addButton = screen.getByText('Add Activity')
    expect(addButton).toBeInTheDocument()
    
    fireEvent.click(addButton)
    expect(mockProps.onAddActivity).toHaveBeenCalled()
  })

  it('displays route information', () => {
    render(<TimeGap {...mockProps} />)
    
    expect(screen.getByText(/Museum of Art/)).toBeInTheDocument()
    expect(screen.getByText(/Central Park/)).toBeInTheDocument()
  })

  it('renders transport mode options', () => {
    render(<TimeGap {...mockProps} />)
    
    // Check for transport buttons (icons should be present)
    const transportButtons = screen.getAllByRole('button').filter(button => 
      button.getAttribute('title') && ['Walk', 'Drive', 'Transit', 'Bike'].includes(button.getAttribute('title')!)
    )
    
    expect(transportButtons).toHaveLength(4)
  })

  it('handles transport mode selection', async () => {
    const user = userEvent.setup()
    render(<TimeGap {...mockProps} />)
    
    const driveButton = screen.getByTitle('Drive')
    await user.click(driveButton)
    
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'transport_Museum_of_Art,_New_York_to_Central_Park,_New_York',
      'driving'
    )
    
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transportModeChanged',
        detail: expect.objectContaining({
          mode: 'driving',
          fromLocation: 'Museum of Art, New York',
          toLocation: 'Central Park, New York'
        })
      })
    )
  })

  it('calculates travel time', async () => {
    render(<TimeGap {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('15 mins')).toBeInTheDocument()
    })
    
    expect(mockGoogleMaps.DistanceMatrixService).toHaveBeenCalled()
  })

  it('shows directions button', () => {
    render(<TimeGap {...mockProps} />)
    
    const directionsButton = screen.getByText('Directions')
    expect(directionsButton).toBeInTheDocument()
  })

  it('opens Google Maps when directions clicked', async () => {
    // Mock window.open
    const mockOpen = jest.fn()
    Object.defineProperty(window, 'open', { value: mockOpen, writable: true })
    
    const user = userEvent.setup()
    render(<TimeGap {...mockProps} />)
    
    const directionsButton = screen.getByText('Directions')
    await user.click(directionsButton)
    
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/maps/dir/'),
      '_blank',
      'noopener,noreferrer'
    )
  })

  it('handles transit mode with detailed directions', async () => {
    render(<TimeGap {...mockProps} />)
    
    // Select transit mode
    const transitButton = screen.getByTitle('Transit')
    fireEvent.click(transitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Transit Details (15 mins)')).toBeInTheDocument()
    })
  })

  it('shows transit directions when expanded', async () => {
    render(<TimeGap {...mockProps} />)
    
    // Select transit mode
    const transitButton = screen.getByTitle('Transit')
    fireEvent.click(transitButton)
    
    // Wait for transit details to load and appear
    await waitFor(() => {
      expect(screen.getByText('Transit Details (15 mins)')).toBeInTheDocument()
    })
    
    // The details should be expanded by default (showTransitDetails starts as true)
    await waitFor(() => {
      // Look for the line name and vehicle type (they're rendered as "6 SUBWAY")
      expect(screen.getByText(/6.*SUBWAY/)).toBeInTheDocument()
      expect(screen.getByText('59th St → 86th St')).toBeInTheDocument()
      expect(screen.getByText('10:15am - 10:23am')).toBeInTheDocument()
    })
  })

  it('handles accommodation commute display', () => {
    render(
      <TimeGap 
        {...mockProps}
        isAccommodationCommute={true}
        commuteType="start"
      />
    )
    
    expect(screen.getByText('Start day at 12:00')).toBeInTheDocument()
  })

  it('handles end day accommodation commute', () => {
    render(
      <TimeGap 
        {...mockProps}
        isAccommodationCommute={true}
        commuteType="end"
      />
    )
    
    expect(screen.getByText('End day at 10:00')).toBeInTheDocument()
  })

  it('does not render for small time gaps', () => {
    const smallGapProps = {
      ...mockProps,
      startTime: '10:00',
      endTime: '10:20' // Only 20 minutes
    }
    
    render(<TimeGap {...smallGapProps} />)
    
    // Component should not render for gaps less than 30 minutes
    expect(screen.queryByText('20m gap')).not.toBeInTheDocument()
  })

  it('handles missing time information', () => {
    const noTimeProps = {
      ...mockProps,
      startTime: undefined,
      endTime: undefined
    }
    
    render(<TimeGap {...noTimeProps} />)
    
    // Component should not render without time information
    expect(screen.queryByText('Add Activity')).not.toBeInTheDocument()
  })

  it('handles same location routes', async () => {
    const sameLocationProps = {
      ...mockProps,
      fromLocation: 'Central Park, New York',
      toLocation: 'Central Park, New York'
    }
    
    render(<TimeGap {...sameLocationProps} />)
    
    // Should not show travel time for same location
    await waitFor(() => {
      expect(screen.queryByText(/mins/)).not.toBeInTheDocument()
    })
  })

  it('loads initial transport preference from localStorage', () => {
    const mockGetItem = window.localStorage.getItem as jest.MockedFunction<typeof localStorage.getItem>
    mockGetItem.mockReturnValue('driving')
    
    render(<TimeGap {...mockProps} />)
    
    expect(mockGetItem).toHaveBeenCalledWith(
      'transport_Museum_of_Art,_New_York_to_Central_Park,_New_York'
    )
  })

  it('handles travel time calculation errors', async () => {
    // Mock the DistanceMatrixService to return error before rendering
    const originalService = mockGoogleMaps.DistanceMatrixService
    mockGoogleMaps.DistanceMatrixService = jest.fn(() => ({
      getDistanceMatrix: jest.fn((request, callback) => {
        callback({ rows: [{ elements: [{ status: 'ZERO_RESULTS' }] }] }, 'ZERO_RESULTS')
      })
    }))
    
    render(<TimeGap {...mockProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Unable to calculate')).toBeInTheDocument()
    })
    
    // Restore original service
    mockGoogleMaps.DistanceMatrixService = originalService
  })

  it('handles transit directions loading state', () => {
    render(<TimeGap {...mockProps} />)
    
    const transitButton = screen.getByTitle('Transit')
    fireEvent.click(transitButton)
    
    expect(screen.getByText('Loading transit directions...')).toBeInTheDocument()
  })

  it('collapses and expands transit details', async () => {
    render(<TimeGap {...mockProps} />)
    
    const transitButton = screen.getByTitle('Transit')
    fireEvent.click(transitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Transit Details (15 mins)')).toBeInTheDocument()
    })
    
    const detailsButton = screen.getByText('Transit Details (15 mins)')
    fireEvent.click(detailsButton)
    
    // Details should be collapsed (steps should not be visible)
    await waitFor(() => {
      expect(screen.queryByText('Walk to subway station')).not.toBeInTheDocument()
    })
  })
})