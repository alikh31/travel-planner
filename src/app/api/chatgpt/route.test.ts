import { POST, GET } from './route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import * as chatgptLib from '@/lib/chatgpt'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))

jest.mock('@/lib/chatgpt', () => ({
  sendToChatGPT: jest.fn(),
  createTravelPrompt: jest.fn()
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockSendToChatGPT = chatgptLib.sendToChatGPT as jest.MockedFunction<typeof chatgptLib.sendToChatGPT>
const mockCreateTravelPrompt = chatgptLib.createTravelPrompt as jest.MockedFunction<typeof chatgptLib.createTravelPrompt>

describe('/api/chatgpt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment variable
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({ message: 'test message' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if no message or messages provided', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Either message or messages array is required')
    })

    it('should process single message with travel context', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })
      mockCreateTravelPrompt.mockReturnValue([
        { role: 'system', content: 'You are a travel assistant' },
        { role: 'user', content: 'Plan a trip to Paris' }
      ])
      mockSendToChatGPT.mockResolvedValue({
        content: 'Here are some suggestions for Paris...',
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
      })

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Plan a trip to Paris',
          context: 'User is interested in museums and cafes'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toBe('Here are some suggestions for Paris...')
      expect(data.usage).toEqual({ prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 })
      expect(mockCreateTravelPrompt).toHaveBeenCalledWith('Plan a trip to Paris', 'User is interested in museums and cafes')
      expect(mockSendToChatGPT).toHaveBeenCalledWith(
        expect.any(Array),
        'gpt-3.5-turbo',
        1000
      )
    })

    it('should process messages array for conversation history', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })
      mockSendToChatGPT.mockResolvedValue({
        content: 'Follow-up response...'
      })

      const messages = [
        { role: 'system' as const, content: 'You are a travel assistant' },
        { role: 'user' as const, content: 'Plan a trip to Paris' },
        { role: 'assistant' as const, content: 'Here are some suggestions...' },
        { role: 'user' as const, content: 'What about restaurants?' }
      ]

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({
          messages,
          model: 'gpt-4',
          maxTokens: 1500
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.response).toBe('Follow-up response...')
      expect(mockSendToChatGPT).toHaveBeenCalledWith(messages, 'gpt-4', 1500)
      expect(mockCreateTravelPrompt).not.toHaveBeenCalled()
    })

    it('should handle ChatGPT API errors', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })
      mockCreateTravelPrompt.mockReturnValue([
        { role: 'system', content: 'You are a travel assistant' },
        { role: 'user', content: 'Plan a trip' }
      ])
      mockSendToChatGPT.mockRejectedValue(new Error('API rate limit exceeded'))

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({ message: 'Plan a trip' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('API rate limit exceeded')
    })

    it('should handle missing API key error', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'test-user' } })
      mockCreateTravelPrompt.mockReturnValue([
        { role: 'system', content: 'You are a travel assistant' },
        { role: 'user', content: 'Plan a trip' }
      ])
      mockSendToChatGPT.mockRejectedValue(new Error('OPENAI_API_KEY environment variable is not set'))

      const request = new NextRequest('http://localhost/api/chatgpt', {
        method: 'POST',
        body: JSON.stringify({ message: 'Plan a trip' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('OpenAI API key not configured')
    })
  })

  describe('GET', () => {
    it('should return health check with API key status', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.openai_configured).toBe(true)
    })

    it('should return false for openai_configured when no API key', async () => {
      delete process.env.OPENAI_API_KEY

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.openai_configured).toBe(false)
    })
  })
})