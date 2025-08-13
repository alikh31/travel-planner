import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TimeGap from '../../components/TimeGap'
import ActivitiesMap from '../../components/ActivitiesMap'

// Mock Google Maps module
jest.mock('../../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn(),
  getPlacePhoto: jest.fn().mockResolvedValue('mock-photo-url'),
}))

const { loadGoogleMaps } = require('../../lib/googleMaps')
const mockLoadGoogleMaps = loadGoogleMaps as jest.MockedFunction<typeof loadGoogleMaps>

describe('Transport Mode Integration', () => {
  const mockActivities = [
    {
      id: 'activity-1',
      title: 'Museum Visit',
      location: 'Art Museum, New York',
      locationLat: 40.7128,
      locationLng: -74.0060,
      activityNumber: 2
    },
    {
      id: 'activity-2',
      title: 'Central Park',
      location: 'Central Park, New York',
      locationLat: 40.7829,
      locationLng: -73.9654,
      activityNumber: 3
    }
  ]

  let mockDirectionsRenderer: any
  let mockDirectionsService: any

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
    DirectionsService: jest.fn(() => {
      mockDirectionsService = {
        route: jest.fn((request, callback) => {
          callback({ 
            routes: [{ 
              legs: [{ 
                start_address: 'Art Museum, New York',
                end_address: 'Central Park, New York',
                start_location: {},
                end_location: {},
                duration: { text: '15 mins' },
                distance: { text: '1.2 km' }
              }] 
            }] 
          }, 'OK')
        })
      }
      return mockDirectionsService
    }),
    DirectionsRenderer: jest.fn(() => {
      mockDirectionsRenderer = {
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
      }
      return mockDirectionsRenderer
    }),
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
    DistanceMatrixStatus: { OK: 'OK' },
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

    // Clear any existing event listeners
    window.addEventListener = jest.fn()
    window.removeEventListener = jest.fn()
    window.dispatchEvent = jest.fn()
  })

  it('updates map routes when transport mode changes in TimeGap', async () => {
    const user = userEvent.setup()
    
    // Render both components
    render(
      <div>
        <TimeGap
          startTime="10:00"
          endTime="12:00"
          fromLocation="Art Museum, New York"
          toLocation="Central Park, New York"
          onAddActivity={jest.fn()}
        />
        <ActivitiesMap activities={mockActivities} />
      </div>
    )

    // Wait for map to initialize
    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })

    // Clear mocks to track transport change
    jest.clearAllMocks()

    // Find and click the driving transport button in TimeGap
    const driveButton = screen.getByTitle('Drive')
    await user.click(driveButton)

    // Verify localStorage was updated
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'transport_Art_Museum,_New_York_to_Central_Park,_New_York',
      'driving'
    )

    // Verify event was dispatched
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'transportModeChanged',
        detail: expect.objectContaining({
          mode: 'driving',
          fromLocation: 'Art Museum, New York',
          toLocation: 'Central Park, New York'
        })
      })
    )

    // Now simulate the event listener being set up and triggered
    // This is what would happen in the real integration
    const eventListener = (window.addEventListener as jest.Mock).mock.calls
      .find(call => call[0] === 'transportModeChanged')?.[1]

    if (eventListener) {
      const mockEvent = {
        detail: {
          routeKey: 'transport_Art_Museum,_New_York_to_Central_Park,_New_York',
          mode: 'driving',
          fromLocation: 'Art Museum, New York',
          toLocation: 'Central Park, New York'
        }
      }

      await eventListener(mockEvent)

      // Verify that the map routes were redrawn
      await waitFor(() => {
        expect(mockDirectionsService.route).toHaveBeenCalledWith(
          expect.objectContaining({
            travelMode: 'DRIVING'
          }),
          expect.any(Function)
        )
      })
    }
  })

  it('preserves transport preferences across map reloads', async () => {
    const mockGetItem = window.localStorage.getItem as jest.MockedFunction<typeof localStorage.getItem>
    mockGetItem.mockReturnValue('driving') // Previously saved preference
    
    render(<ActivitiesMap activities={mockActivities} />)

    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })

    // Verify that the map uses the saved transport preference
    await waitFor(() => {
      expect(mockDirectionsService.route).toHaveBeenCalledWith(
        expect.objectContaining({
          travelMode: 'DRIVING'
        }),
        expect.any(Function)
      )
    })

    expect(mockGetItem).toHaveBeenCalledWith(
      'transport_Art_Museum,_New_York_to_Central_Park,_New_York'
    )
  })

  it('handles multiple transport mode changes correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <div>
        <TimeGap
          startTime="10:00"
          endTime="12:00"
          fromLocation="Art Museum, New York"
          toLocation="Central Park, New York"
          onAddActivity={jest.fn()}
        />
        <ActivitiesMap activities={mockActivities} />
      </div>
    )

    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })

    // Change to walking
    const walkButton = screen.getByTitle('Walk')
    await user.click(walkButton)

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'transport_Art_Museum,_New_York_to_Central_Park,_New_York',
      'walking'
    )

    // Change to bicycling
    const bikeButton = screen.getByTitle('Bike')
    await user.click(bikeButton)

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'transport_Art_Museum,_New_York_to_Central_Park,_New_York',
      'bicycling'
    )

    // Verify multiple events were dispatched
    expect(window.dispatchEvent).toHaveBeenCalledTimes(2)
  })

  it('shows correct travel time for selected transport mode', async () => {
    const user = userEvent.setup()
    
    render(
      <TimeGap
        startTime="10:00"
        endTime="12:00"
        fromLocation="Art Museum, New York"
        toLocation="Central Park, New York"
        onAddActivity={jest.fn()}
      />
    )

    // Wait for initial travel time calculation
    await waitFor(() => {
      expect(screen.getByText('15 mins')).toBeInTheDocument()
    })

    // Change transport mode - this should trigger new travel time calculation
    const driveButton = screen.getByTitle('Drive')
    await user.click(driveButton)

    // The DistanceMatrixService should be called again with new travel mode
    await waitFor(() => {
      expect(mockGoogleMaps.DistanceMatrixService).toHaveBeenCalled()
    })
  })

  it('handles transport mode changes with accommodation routes', async () => {
    const user = userEvent.setup()
    
    render(
      <div>
        <TimeGap
          startTime="08:00"
          endTime="10:00"
          fromLocation="Test Hotel, New York"
          toLocation="Art Museum, New York"
          onAddActivity={jest.fn()}
          isAccommodationCommute={true}
          commuteType="start"
        />
        <ActivitiesMap 
          activities={mockActivities} 
          accommodationLocation="Test Hotel, New York"
        />
      </div>
    )

    await waitFor(() => {
      expect(mockGoogleMaps.Map).toHaveBeenCalled()
    })

    // Change transport mode for accommodation route
    const driveButton = screen.getByTitle('Drive')
    await user.click(driveButton)

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'transport_Test_Hotel,_New_York_to_Art_Museum,_New_York',
      'driving'
    )

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({
          fromLocation: 'Test Hotel, New York',
          toLocation: 'Art Museum, New York'
        })
      })
    )
  })

  it('handles event cleanup properly', () => {
    const { unmount } = render(<ActivitiesMap activities={mockActivities} />)
    
    expect(window.addEventListener).toHaveBeenCalledWith(
      'transportModeChanged',
      expect.any(Function)
    )

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'transportModeChanged',
      expect.any(Function)
    )
  })

  it('handles Google Maps loading errors gracefully during transport changes', async () => {
    mockLoadGoogleMaps.mockRejectedValue(new Error('Maps API error'))
    
    const user = userEvent.setup()
    
    render(
      <div>
        <TimeGap
          startTime="10:00"
          endTime="12:00"
          fromLocation="Art Museum, New York"
          toLocation="Central Park, New York"
          onAddActivity={jest.fn()}
        />
        <ActivitiesMap activities={mockActivities} />
      </div>
    )

    // Map should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load map')).toBeInTheDocument()
    })

    // TimeGap should still work for transport selection
    const driveButton = screen.getByTitle('Drive')
    await user.click(driveButton)

    // localStorage should still be updated even if map fails
    expect(window.localStorage.setItem).toHaveBeenCalled()
  })
})