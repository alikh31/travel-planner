import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import SettingsPage from './page'

// Mock the useSession hook
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>

// Mock Next.js navigation
const mockPush = jest.fn()
const mockReplace = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/settings',
}))

// Mock LocationSearch component
jest.mock('@/components/LocationSearch', () => {
  return function MockLocationSearch({ value, onChange, placeholder }: any) {
    return (
      <input
        data-testid="location-search"
        value={value}
        onChange={(e) => onChange(e.target.value, { 
          place_id: 'mock-place-id', 
          geometry: { 
            location: { 
              lat: 40.7128, 
              lng: -74.0060 
            } 
          } 
        })}
        placeholder={placeholder}
      />
    )
  }
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('SettingsPage', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('renders settings page correctly', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Travel Preferences')).toBeInTheDocument()
    expect(screen.getByText('Home City')).toBeInTheDocument()
    expect(screen.getByText('Preferred Start of Day')).toBeInTheDocument()
    expect(screen.getByText('Preferred Return to Accommodation')).toBeInTheDocument()
  })

  it('loads default settings when no saved settings exist', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    // Check default time values
    const startTimeInput = screen.getByDisplayValue('09:00')
    const endTimeInput = screen.getByDisplayValue('21:00')

    expect(startTimeInput).toBeInTheDocument()
    expect(endTimeInput).toBeInTheDocument()
  })

  it('loads saved settings from localStorage', async () => {
    const savedSettings = {
      homeCity: 'New York, NY',
      preferredStartTime: '08:00',
      preferredEndTime: '19:00'
    }
    
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings))
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    await waitFor(() => {
      const homeCityInput = screen.getByTestId('location-search')
      const startTimeInput = screen.getByDisplayValue('08:00')
      const endTimeInput = screen.getByDisplayValue('19:00')

      expect(homeCityInput).toHaveValue('New York, NY')
      expect(startTimeInput).toBeInTheDocument()
      expect(endTimeInput).toBeInTheDocument()
    })
  })

  it('updates settings when form fields are changed', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    // Change home city
    const homeCityInput = screen.getByTestId('location-search')
    fireEvent.change(homeCityInput, { target: { value: 'San Francisco, CA' } })

    // Change start time
    const startTimeInput = screen.getByDisplayValue('09:00')
    fireEvent.change(startTimeInput, { target: { value: '08:30' } })

    // Change end time
    const endTimeInput = screen.getByDisplayValue('21:00')
    fireEvent.change(endTimeInput, { target: { value: '17:30' } })

    expect(homeCityInput).toHaveValue('San Francisco, CA')
    expect(startTimeInput).toHaveValue('08:30')
    expect(endTimeInput).toHaveValue('17:30')
  })

  it('saves settings to localStorage when save button is clicked', async () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    // Change a setting
    const startTimeInput = screen.getByDisplayValue('09:00')
    fireEvent.change(startTimeInput, { target: { value: '08:00' } })

    // Click save button
    const saveButton = screen.getByText('Save Settings')
    fireEvent.click(saveButton)

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'settings-test-user-id',
        expect.stringContaining('"preferredStartTime":"08:00"')
      )
    })

    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
    })
  })

  it('redirects to signin when not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated'
    })

    render(<SettingsPage />)

    expect(mockPush).toHaveBeenCalledWith('/auth/signin')
  })

  it('shows loading state initially', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading'
    })

    render(<SettingsPage />)

    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('displays default settings values in form fields', () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    render(<SettingsPage />)

    // Check that default values are set in the form fields
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('21:00')).toBeInTheDocument()
  })
})