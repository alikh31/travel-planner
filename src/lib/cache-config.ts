/**
 * Cache Configuration
 * 
 * TTL values are configurable through environment variables
 * Default: 365 days (1 year) for maximum cost savings
 */

// Convert hours to milliseconds
const hoursToMs = (hours: number) => hours * 60 * 60 * 1000

// Default TTL values (in hours)
const DEFAULT_TTL_HOURS = 8760 // 365 days = 8760 hours

// Cache TTL configuration with environment variable overrides
export const CACHE_CONFIG = {
  PLACES: {
    TTL_MS: hoursToMs(parseInt(process.env.CACHE_PLACES_TTL_HOURS || DEFAULT_TTL_HOURS.toString())),
    TTL_HOURS: parseInt(process.env.CACHE_PLACES_TTL_HOURS || DEFAULT_TTL_HOURS.toString()),
    DESCRIPTION: 'Place details (name, rating, address, etc.)'
  },
  
  IMAGES: {
    TTL_MS: hoursToMs(parseInt(process.env.CACHE_IMAGES_TTL_HOURS || DEFAULT_TTL_HOURS.toString())),
    TTL_HOURS: parseInt(process.env.CACHE_IMAGES_TTL_HOURS || DEFAULT_TTL_HOURS.toString()),
    DESCRIPTION: 'Place photos and images'
  },
  
  SEARCHES: {
    TTL_MS: hoursToMs(parseInt(process.env.CACHE_SEARCHES_TTL_HOURS || DEFAULT_TTL_HOURS.toString())),
    TTL_HOURS: parseInt(process.env.CACHE_SEARCHES_TTL_HOURS || DEFAULT_TTL_HOURS.toString()),
    DESCRIPTION: 'Search results and geocoding'
  },
  
  DEFAULT: {
    TTL_MS: hoursToMs(DEFAULT_TTL_HOURS),
    TTL_HOURS: DEFAULT_TTL_HOURS,
    DESCRIPTION: 'General cache default'
  }
}

/**
 * Get cache stats with human-readable TTL info
 */
export const getCacheConfigInfo = () => {
  const formatTTL = (hours: number) => {
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''}`
    const days = Math.floor(hours / 24)
    if (days < 365) return `${days} day${days !== 1 ? 's' : ''}`
    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    if (remainingDays === 0) return `${years} year${years !== 1 ? 's' : ''}`
    return `${years} year${years !== 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
  }

  return {
    places: {
      ttl: formatTTL(CACHE_CONFIG.PLACES.TTL_HOURS),
      description: CACHE_CONFIG.PLACES.DESCRIPTION
    },
    images: {
      ttl: formatTTL(CACHE_CONFIG.IMAGES.TTL_HOURS),
      description: CACHE_CONFIG.IMAGES.DESCRIPTION
    },
    searches: {
      ttl: formatTTL(CACHE_CONFIG.SEARCHES.TTL_HOURS),
      description: CACHE_CONFIG.SEARCHES.DESCRIPTION
    }
  }
}

/**
 * Suggested TTL presets for different environments
 */
export const CACHE_PRESETS = {
  DEVELOPMENT: {
    PLACES: 1, // 1 hour
    IMAGES: 24, // 1 day
    SEARCHES: 1, // 1 hour
    DESCRIPTION: 'Short cache for development/testing'
  },
  
  STAGING: {
    PLACES: 168, // 1 week
    IMAGES: 720, // 1 month
    SEARCHES: 24, // 1 day
    DESCRIPTION: 'Medium cache for staging environment'
  },
  
  PRODUCTION: {
    PLACES: 8760, // 1 year
    IMAGES: 8760, // 1 year
    SEARCHES: 8760, // 1 year
    DESCRIPTION: 'Long cache for production (maximum cost savings)'
  },
  
  PRODUCTION_CONSERVATIVE: {
    PLACES: 720, // 1 month
    IMAGES: 2160, // 3 months
    SEARCHES: 168, // 1 week
    DESCRIPTION: 'Conservative production cache with regular refreshes'
  }
}

/**
 * Helper to validate cache TTL values
 */
export const validateCacheTTL = (hours: number, type: string) => {
  if (hours < 0) {
    console.warn(`Invalid ${type} cache TTL: ${hours}. Must be positive. Using default.`)
    return DEFAULT_TTL_HOURS
  }
  
  if (hours > 8760 * 10) { // More than 10 years
    console.warn(`Very long ${type} cache TTL: ${hours} hours. Consider if this is intentional.`)
  }
  
  return hours
}