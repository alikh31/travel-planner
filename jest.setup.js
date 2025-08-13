import '@testing-library/jest-dom'

// Mock Google Maps
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
    route: jest.fn(),
  })),
  DirectionsRenderer: jest.fn(() => ({
    setMap: jest.fn(),
    setDirections: jest.fn(),
    getDirections: jest.fn(() => ({
      routes: [{ legs: [{ start_address: 'Test Start', end_address: 'Test End', start_location: {}, end_location: {} }] }]
    })),
  })),
  DistanceMatrixService: jest.fn(() => ({
    getDistanceMatrix: jest.fn(),
  })),
  Geocoder: jest.fn(() => ({
    geocode: jest.fn(),
  })),
  LatLngBounds: jest.fn(() => ({
    extend: jest.fn(),
    getCenter: jest.fn(),
  })),
  TravelMode: {
    DRIVING: 'DRIVING',
    WALKING: 'WALKING',
    TRANSIT: 'TRANSIT',
    BICYCLING: 'BICYCLING',
  },
  MapTypeId: {
    ROADMAP: 'roadmap',
  },
  SymbolPath: {
    CIRCLE: 'circle',
  },
  DirectionsStatus: {
    OK: 'OK',
  },
  DistanceMatrixStatus: {
    OK: 'OK',
  },
}

// Set up global Google Maps mock that works with async loading
const createGoogleMapsAPI = () => ({
  ...mockGoogleMaps,
  // Make constructors return proper instances
  Map: function(element, options) {
    const instance = {
      setCenter: jest.fn(),
      setZoom: jest.fn(),
      fitBounds: jest.fn(),
    }
    mockGoogleMaps.Map.mockReturnValue(instance)
    return instance
  },
  Marker: function(options) {
    const instance = {
      setMap: jest.fn(),
      addListener: jest.fn(),
    }
    mockGoogleMaps.Marker.mockReturnValue(instance)
    return instance
  },
  InfoWindow: function(options) {
    const instance = {
      open: jest.fn(),
      close: jest.fn(),
    }
    mockGoogleMaps.InfoWindow.mockReturnValue(instance)
    return instance
  },
  DirectionsRenderer: function(options) {
    const instance = {
      setMap: jest.fn(),
      setDirections: jest.fn(),
      getDirections: jest.fn(() => ({
        routes: [{ legs: [{ start_address: 'Test Start', end_address: 'Test End', start_location: {}, end_location: {} }] }]
      })),
    }
    mockGoogleMaps.DirectionsRenderer.mockReturnValue(instance)
    return instance
  },
})

// Set up global Google Maps mock
Object.defineProperty(window, 'google', {
  value: {
    maps: createGoogleMapsAPI(),
  },
  writable: true,
})

// Set up global google object
global.google = {
  maps: createGoogleMapsAPI(),
}

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
    },
    status: 'authenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useParams: jest.fn(() => ({ id: 'test-id' })),
  usePathname: jest.fn(() => '/test-path'),
}))

// Mock localStorage with proper default values
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(() => null),
  },
  writable: true,
})

// Mock window.dispatchEvent
Object.defineProperty(window, 'dispatchEvent', {
  value: jest.fn(),
  writable: true,
})

// Mock window.addEventListener
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
})

// Mock window.removeEventListener
Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
})

// Set up test environment variables
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-maps-api-key'

// Mock NextResponse and NextRequest for API route testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, options = {}) => ({
      status: options.status || 200,
      json: async () => data,
    }),
  },
  NextRequest: class NextRequest {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this._body = options.body
    }
    
    async json() {
      return JSON.parse(this._body || '{}')
    }
  },
}))

// Individual component tests will handle Google Maps mocking

// Mock next-auth and related modules globally to avoid ES module issues
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  default: jest.fn(),
}))

jest.mock('next-auth/providers/google', () => ({
  default: jest.fn(),
}))

jest.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(),
}))

// Mock Web APIs for Next.js API routes with simple mocks
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map(Object.entries(options.headers || {}))
      this._body = options.body
    }
    
    async json() {
      return JSON.parse(this._body || '{}')
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, options = {}) {
      this._body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Map(Object.entries(options.headers || {}))
    }
    
    async json() {
      return JSON.parse(this._body || '{}')
    }
    
    static json(data, options) {
      return new Response(JSON.stringify(data), {
        ...options,
        headers: { 'content-type': 'application/json', ...options?.headers }
      })
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers extends Map {
    constructor(init) {
      super()
      if (init) {
        for (const [key, value] of Object.entries(init)) {
          this.set(key.toLowerCase(), value)
        }
      }
    }
    
    get(name) {
      return super.get(name.toLowerCase())
    }
    
    set(name, value) {
      return super.set(name.toLowerCase(), value)
    }
  }
}