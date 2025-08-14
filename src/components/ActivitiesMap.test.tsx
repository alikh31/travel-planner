import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ActivitiesMap from './ActivitiesMap'

// Mock Google Maps module
jest.mock('../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn(),
  getPlacePhoto: jest.fn().mockResolvedValue('mock-photo-url'),
}))

const { loadGoogleMaps } = require('../lib/googleMaps')
const mockLoadGoogleMaps = loadGoogleMaps as jest.MockedFunction<typeof loadGoogleMaps>

describe('ActivitiesMap', () => {
  const mockActivities = [
    {
      id: 'activity-1',
      title: 'Museum Visit',
      description: 'Visit the art museum',
      location: 'Art Museum, New York',
      locationLat: 40.7128,
      locationLng: -74.0060,
      startTime: '10:00',
      duration: 120,
      activityNumber: 2
    },
    {
      id: 'activity-2',
      title: 'Central Park',
      description: 'Walk in the park',
      location: 'Central Park, New York',
      locationLat: 40.7829,
      locationLng: -73.9654,
      startTime: '14:00',
      duration: 90,
      activityNumber: 3
    }
  ]

  const mockGoogleMaps = {
    Map: jest.fn(() => ({
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      fitBounds: jest.fn(),
    })),
    Marker: jest.fn(() => ({
      setMap: jest.fn(),
      addListener: jest.fn(),
    })),
    InfoWindow: jest.fn(() => ({
      open: jest.fn(),
      close: jest.fn(),
    })),
    DirectionsService: jest.fn(() => ({
      route: jest.fn((request, callback) => {
        callback({ routes: [{ legs: [{}] }] }, 'OK')
      }),
    })),
    DirectionsRenderer: jest.fn(() => ({
      setMap: jest.fn(),
      setDirections: jest.fn(),
      getDirections: jest.fn(() => ({
        routes: [{ 
          legs: [{ 
            start_address: 'Art Museum, New York',
            end_address: 'Central Park, New York',
            start_location: {},
            end_location: {}
          }]
        }]
      })),
    })),
    LatLngBounds: jest.fn(() => ({
      extend: jest.fn(),
      getCenter: jest.fn(),
    })),
    Geocoder: jest.fn(() => ({
      geocode: jest.fn((request, callback) => {
        callback([{
          geometry: {
            location: { lat: () => 40.7580, lng: () => -73.9855 }
          }
        }], 'OK')
      }),
    })),
    TravelMode: {
      DRIVING: 'DRIVING',
      WALKING: 'WALKING',
      TRANSIT: 'TRANSIT',
      BICYCLING: 'BICYCLING',
    },
    MapTypeId: { ROADMAP: 'roadmap' },
    SymbolPath: { CIRCLE: 'circle' },
    DirectionsStatus: { OK: 'OK' },
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
  })

  it('renders loading state initially', () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    expect(screen.getByText('Loading map...')).toBeInTheDocument()
  })

  it('renders map after loading', async () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })
    
    expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(4) // Activity markers + accommodation markers
  })

  it('creates markers for activities with location data', async () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.Marker).toHaveBeenCalledTimes(2)
    })
    
    // Check that markers are created with correct activity numbers
    expect(mockGoogleMaps.Marker).toHaveBeenCalledWith(
      expect.objectContaining({
        position: { lat: 40.7128, lng: -74.0060 },
        title: 'Museum Visit',
        label: expect.objectContaining({
          text: '2'
        })
      })
    )
  })

  it('creates routes between activities', async () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.DirectionsService).toHaveBeenCalled()
      expect(mockGoogleMaps.DirectionsRenderer).toHaveBeenCalled()
    })
    
    const directionsService = mockGoogleMaps.DirectionsService.mock.results[0].value
    expect(directionsService.route).toHaveBeenCalled()
  })

  it('handles accommodation location', async () => {
    const accommodationLocation = 'Test Hotel, New York'
    
    render(
      <ActivitiesMap 
        activities={mockActivities} 
        accommodationLocation={accommodationLocation}
      />
    )
    
    await waitFor(() => {
      expect(mockGoogleMaps.Geocoder).toHaveBeenCalled()
    })
    
    const geocoder = mockGoogleMaps.Geocoder.mock.results[0].value
    expect(geocoder.geocode).toHaveBeenCalledWith(
      { address: accommodationLocation },
      expect.any(Function)
    )
  })

  it('handles empty activities list', () => {
    render(<ActivitiesMap activities={[]} />)
    
    expect(screen.getByText('No activities with location data to display on map')).toBeInTheDocument()
  })

  it('handles activities without location data', async () => {
    const activitiesWithoutLocation = [
      {
        id: 'activity-1',
        title: 'Activity without location',
        description: 'No location data'
      }
    ]
    
    render(<ActivitiesMap activities={activitiesWithoutLocation as any} />)
    
    expect(screen.getByText('No activities with location data to display on map')).toBeInTheDocument()
  })

  it('handles modal mode', () => {
    const onClose = jest.fn()
    
    render(
      <ActivitiesMap 
        activities={mockActivities} 
        isModal={true}
        onClose={onClose}
      />
    )
    
    expect(screen.getByText('Back to Activities')).toBeInTheDocument()
    
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalled()
  })

  it('handles transport mode changes', async () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })
    
    // Simulate transport mode change event
    const event = new CustomEvent('transportModeChanged', {
      detail: {
        routeKey: 'transport_Art_Museum_New_York_to_Central_Park_New_York',
        mode: 'driving',
        fromLocation: 'Art Museum, New York',
        toLocation: 'Central Park, New York'
      }
    })
    
    window.dispatchEvent(event)
    
    // Wait for the event handler to process
    await waitFor(() => {
      // Should rebuild routes when transport mode changes
      expect(mockGoogleMaps.DirectionsService).toHaveBeenCalled()
    })
  })

  it('uses transport preferences from localStorage', async () => {
    const mockGetItem = window.localStorage.getItem as jest.MockedFunction<typeof localStorage.getItem>
    mockGetItem.mockReturnValue('driving')
    
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.DirectionsService).toHaveBeenCalled()
    })
    
    const directionsService = mockGoogleMaps.DirectionsService.mock.results[0].value
    expect(directionsService.route).toHaveBeenCalledWith(
      expect.objectContaining({
        travelMode: 'DRIVING'
      }),
      expect.any(Function)
    )
  })

  it('handles Google Maps loading errors', async () => {
    mockLoadGoogleMaps.mockRejectedValue(new Error('Failed to load Google Maps'))
    
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load map')).toBeInTheDocument()
    })
  })

  it('creates info windows for markers', async () => {
    render(<ActivitiesMap activities={mockActivities} />)
    
    await waitFor(() => {
      expect(mockGoogleMaps.InfoWindow).toHaveBeenCalledTimes(2)
    })
    
    // Check that info windows are created with activity information
    expect(mockGoogleMaps.InfoWindow).toHaveBeenCalledWith({
      content: expect.stringContaining('Museum Visit')
    })
  })

  it('handles different route colors for accommodation routes', async () => {
    render(
      <ActivitiesMap 
        activities={mockActivities} 
        accommodationLocation="Test Hotel, New York"
      />
    )
    
    await waitFor(() => {
      expect(mockGoogleMaps.DirectionsRenderer).toHaveBeenCalled()
    })
    
    // Should create multiple renderers with different colors
    const rendererCalls = mockGoogleMaps.DirectionsRenderer.mock.calls
    expect(rendererCalls.length).toBeGreaterThan(1)
    
    // Check for different polyline options
    const hasGreenRoute = rendererCalls.some(call => 
      call[0]?.polylineOptions?.strokeColor === '#10B981'
    )
    const hasPurpleRoute = rendererCalls.some(call => 
      call[0]?.polylineOptions?.strokeColor === '#8B5CF6'
    )
    
    expect(hasGreenRoute || hasPurpleRoute).toBe(true)
  })
})