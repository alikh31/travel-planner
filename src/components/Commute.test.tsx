import { render, screen, fireEvent } from '@testing-library/react'
import Commute from './Commute'

// Mock Google Maps module
jest.mock('../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn(),
}))

describe('Commute', () => {
  const mockProps = {
    fromLocation: 'Museum of Art, New York',
    toLocation: 'Central Park, New York',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
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

  it('renders commute information', () => {
    render(<Commute {...mockProps} />)
    
    expect(screen.getByText(/Museum of Art/)).toBeInTheDocument()
    expect(screen.getByText(/Central Park/)).toBeInTheDocument()
  })

  it('renders transport mode options', () => {
    render(<Commute {...mockProps} />)
    
    // Check for transport buttons (icons should be present)
    const transportButtons = screen.getAllByRole('button').filter(button => 
      button.getAttribute('title') && ['Walk', 'Drive', 'Transit', 'Bike'].includes(button.getAttribute('title')!)
    )
    
    expect(transportButtons).toHaveLength(4)
  })

  it('shows directions button', () => {
    render(<Commute {...mockProps} />)
    
    const directionsButton = screen.getByText('Directions')
    expect(directionsButton).toBeInTheDocument()
  })

  it('does not render when no locations provided', () => {
    const { container } = render(<Commute fromLocation="" toLocation="" />)
    
    expect(container.firstChild).toBeNull()
  })

  it('handles transport mode selection', () => {
    render(<Commute {...mockProps} />)
    
    const driveButton = screen.getByTitle('Drive')
    fireEvent.click(driveButton)
    
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

  it('handles accommodation commute display', () => {
    render(
      <Commute 
        {...mockProps}
        isAccommodationCommute={true}
        commuteType="start"
      />
    )
    
    // Should still render the commute even for accommodation
    expect(screen.getByText(/Museum of Art/)).toBeInTheDocument()
    expect(screen.getByText(/Central Park/)).toBeInTheDocument()
  })

  it('opens Google Maps when directions clicked', () => {
    // Mock window.open
    const mockOpen = jest.fn()
    Object.defineProperty(window, 'open', { value: mockOpen, writable: true })
    
    render(<Commute {...mockProps} />)
    
    const directionsButton = screen.getByText('Directions')
    fireEvent.click(directionsButton)
    
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/maps/dir/'),
      '_blank',
      'noopener,noreferrer'
    )
  })
})