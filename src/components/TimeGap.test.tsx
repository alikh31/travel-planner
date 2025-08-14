import { render, screen, fireEvent } from '@testing-library/react'
import TimeGap from './TimeGap'

describe('TimeGap', () => {
  const mockProps = {
    startTime: '10:00',
    endTime: '12:00',
    onAddActivity: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
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

  it('displays time gap information', () => {
    render(<TimeGap {...mockProps} />)
    
    expect(screen.getByText('2h gap')).toBeInTheDocument()
  })

  it('renders only when there is a significant time gap', () => {
    const shortGapProps = {
      ...mockProps,
      startTime: '10:00',
      endTime: '10:20' // Only 20 minutes
    }
    
    render(<TimeGap {...shortGapProps} />)
    
    // Should not render for gaps less than 30 minutes
    expect(screen.queryByText('20m gap')).not.toBeInTheDocument()
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

})