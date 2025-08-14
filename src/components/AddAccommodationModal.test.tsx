import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import AddAccommodationModal from './AddAccommodationModal'

// Mock the LocationSearch component
jest.mock('./LocationSearch', () => {
  return function MockLocationSearch({ value, onChange, placeholder }: any) {
    return (
      <input
        data-testid="location-search"
        value={value}
        onChange={(e) => onChange(e.target.value, { place_id: 'mock-place-id', name: 'Mock Place' })}
        placeholder={placeholder}
      />
    )
  }
})

// Mock Google Maps
jest.mock('../lib/googleMaps', () => ({
  loadGoogleMaps: jest.fn(() => Promise.resolve(null))
}))

describe('AddAccommodationModal', () => {
  const mockItinerary = {
    id: 'test-itinerary',
    title: 'Test Trip',
    destination: 'Paris',
    startDate: '2024-01-01',
    endDate: '2024-01-05',
    members: [
      { id: 'member-1' },
      { id: 'member-2' },
      { id: 'member-3' }
    ],
    days: [
      { id: 'day-1', date: '2024-01-01' },
      { id: 'day-2', date: '2024-01-02' },
      { id: 'day-3', date: '2024-01-03' },
      { id: 'day-4', date: '2024-01-04' },
      { id: 'day-5', date: '2024-01-05' }
    ]
  }

  const mockAccommodations = [
    {
      id: 'acc-1',
      name: 'Hotel Paris',
      checkIn: '2024-01-01',
      checkOut: '2024-01-02'
    }
  ]

  const mockNewAccommodation = {
    name: '',
    type: 'hotel' as const,
    location: '',
    locationPlaceId: '',
    locationLat: null,
    locationLng: null,
    photoUrl: '',
    checkIn: '',
    nights: 1,
    guests: 1,
    amenities: [],
    notes: ''
  }

  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    newAccommodation: mockNewAccommodation,
    setNewAccommodation: jest.fn(),
    onSubmit: jest.fn(),
    itinerary: mockItinerary,
    accommodations: mockAccommodations,
    editingAccommodation: null
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Modal Visibility', () => {
    it('renders when isOpen is true', () => {
      render(<AddAccommodationModal {...mockProps} />)
      
      expect(screen.getByRole('heading', { name: 'Add Accommodation' })).toBeInTheDocument()
    })

    it('renders edit mode when editingAccommodation is provided', () => {
      const editingAccommodation = {
        id: 'edit-acc-1',
        name: 'Hotel Edit',
        type: 'hotel',
        location: 'Paris, France',
        checkIn: '2024-01-03',
        checkOut: '2024-01-04',
        nights: 1,
        guests: 2,
        amenities: ['wifi'],
        notes: 'Test note',
        order: 1
      }

      render(
        <AddAccommodationModal 
          {...mockProps}
          editingAccommodation={editingAccommodation}
        />
      )
      
      expect(screen.getByRole('heading', { name: 'Edit Accommodation' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Accommodation' })).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(<AddAccommodationModal {...mockProps} isOpen={false} />)
      
      expect(screen.queryByRole('heading', { name: 'Add Accommodation' })).not.toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
      render(<AddAccommodationModal {...mockProps} />)
      
      const closeButton = screen.getByRole('button', { name: 'Close modal' })
      fireEvent.click(closeButton)
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when cancel button is clicked', () => {
      render(<AddAccommodationModal {...mockProps} />)
      
      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)
      
      expect(mockProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Default Values Logic', () => {
    it('sets default check-in date to first day without accommodation', async () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
      })

      // Get the function passed to setNewAccommodation and call it with current state
      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      // Should set check-in to first day without accommodation (2024-01-02)
      // since 2024-01-01 already has accommodation
      expect(result.checkIn).toBe('2024-01-02')
      expect(result.guests).toBe(3) // Should match number of members
    })

    it('sets default guests count to match trip members', async () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalled()
      })

      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      expect(result.guests).toBe(3) // Should match the 3 members in mockItinerary
    })

    it('handles empty accommodations list correctly', async () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          accommodations={[]}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalled()
      })

      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      // Should set to first day of trip when no accommodations exist
      expect(result.checkIn).toBe('2024-01-01')
    })

    it('returns start date when all days have accommodation', async () => {
      const allDaysWithAccommodation = [
        { id: 'acc-1', name: 'Hotel 1', checkIn: '2024-01-01', checkOut: '2024-01-02' },
        { id: 'acc-2', name: 'Hotel 2', checkIn: '2024-01-02', checkOut: '2024-01-03' },
        { id: 'acc-3', name: 'Hotel 3', checkIn: '2024-01-03', checkOut: '2024-01-04' },
        { id: 'acc-4', name: 'Hotel 4', checkIn: '2024-01-04', checkOut: '2024-01-05' },
        { id: 'acc-5', name: 'Hotel 5', checkIn: '2024-01-05', checkOut: '2024-01-06' }
      ]

      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          accommodations={allDaysWithAccommodation}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalled()
      })

      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      // Should fallback to start date when all days have accommodation
      expect(result.checkIn).toBe('2024-01-01')
    })

    it('does not override existing values', async () => {
      const existingAccommodation = {
        ...mockNewAccommodation,
        checkIn: '2024-01-03',
        guests: 2
      }

      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          newAccommodation={existingAccommodation}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        // Should not call setNewAccommodation if values already exist
        expect(setNewAccommodationMock).not.toHaveBeenCalled()
      }, { timeout: 100 })
    })
  })

  describe('Form Interactions', () => {
    it('calls setNewAccommodation when name field changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const nameInput = screen.getByPlaceholderText('Hotel California')
      fireEvent.change(nameInput, { target: { value: 'Grand Hotel' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when location changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const locationSearch = screen.getByTestId('location-search')
      fireEvent.change(locationSearch, { target: { value: 'Paris Hotel' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when accommodation type changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const typeSelect = screen.getByDisplayValue('Hotel')
      fireEvent.change(typeSelect, { target: { value: 'apartment' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when guests count changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const guestsInput = screen.getByDisplayValue('1')
      fireEvent.change(guestsInput, { target: { value: '4' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when nights count changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const nightsSelect = screen.getByDisplayValue('1 night')
      fireEvent.change(nightsSelect, { target: { value: '3' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when amenities are toggled', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const wifiCheckbox = screen.getByLabelText('WiFi')
      fireEvent.click(wifiCheckbox)

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    it('calls setNewAccommodation when notes field changes', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const notesTextarea = screen.getByPlaceholderText('Special requests, booking reference, etc.')
      fireEvent.change(notesTextarea, { target: { value: 'Late checkout requested' } })

      expect(setNewAccommodationMock).toHaveBeenCalledWith(expect.any(Function))
    })

    // The update logic is already well tested through the individual form interaction tests above

    it('correctly updates amenities through callback function', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      const wifiCheckbox = screen.getByLabelText('WiFi')
      fireEvent.click(wifiCheckbox)

      // Get the callback function that was passed to setNewAccommodation
      const updateCallback = setNewAccommodationMock.mock.calls[setNewAccommodationMock.mock.calls.length - 1][0]
      const result = updateCallback({ ...mockNewAccommodation })
      
      expect(result.amenities).toContain('wifi')
    })
  })

  describe('Form Submission', () => {
    it('calls onSubmit when Add Accommodation button is clicked', () => {
      render(<AddAccommodationModal {...mockProps} />)

      const submitButton = screen.getByRole('button', { name: 'Add Accommodation' })
      fireEvent.click(submitButton)

      expect(mockProps.onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles null itinerary gracefully', () => {
      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          itinerary={null}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      // Should not crash and not call setNewAccommodation
      expect(setNewAccommodationMock).not.toHaveBeenCalled()
    })

    it('handles itinerary without days', async () => {
      const itineraryWithoutDays = {
        ...mockItinerary,
        days: []
      }

      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          itinerary={itineraryWithoutDays}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalled()
      })

      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      // Should fallback to start date when no days
      expect(result.checkIn).toBe('2024-01-01')
    })

    it('handles itinerary without members', async () => {
      const itineraryWithoutMembers = {
        ...mockItinerary,
        members: []
      }

      const setNewAccommodationMock = jest.fn()
      
      render(
        <AddAccommodationModal 
          {...mockProps}
          itinerary={itineraryWithoutMembers}
          setNewAccommodation={setNewAccommodationMock}
        />
      )

      await waitFor(() => {
        expect(setNewAccommodationMock).toHaveBeenCalled()
      })

      const updateFunction = setNewAccommodationMock.mock.calls[0][0]
      const result = updateFunction(mockNewAccommodation)

      // Should default to 1 guest when no members
      expect(result.guests).toBe(1)
    })
  })
})