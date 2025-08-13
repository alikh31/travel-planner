import { render, screen } from '@testing-library/react'

// Simple component to test
function TestComponent() {
  return <div>Hello Test</div>
}

describe('Simple Test', () => {
  it('renders hello test', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })
})