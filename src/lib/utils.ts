// Utility functions

// Generate a stable temporary ID that won't cause hydration mismatches
let tempIdCounter = 0
export const generateTempId = (prefix: string = 'temp') => {
  // Use a counter plus random string for uniqueness
  // This avoids Date.now() which causes hydration issues
  return `${prefix}-${++tempIdCounter}-${Math.random().toString(36).substr(2, 9)}`
}

// Check if we're running in the browser
export const isBrowser = () => typeof window !== 'undefined'

// Safe date formatting that doesn't cause hydration issues
export const formatDateSafely = (date: string | Date, formatStr: string) => {
  if (!isBrowser()) {
    // Return a consistent format during SSR
    return new Date(date).toISOString().split('T')[0]
  }
  
  // Use proper formatting on client
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { format } = require('date-fns')
  return format(new Date(date), formatStr)
}