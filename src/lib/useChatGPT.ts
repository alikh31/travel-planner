import { useState, useCallback } from 'react'
import { ChatGPTMessage } from './chatgpt'

export interface ChatGPTHookReturn {
  sendMessage: (message: string, context?: string) => Promise<string>
  sendConversation: (messages: ChatGPTMessage[], model?: string, maxTokens?: number) => Promise<string>
  loading: boolean
  error: string | null
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | null
}

export function useChatGPT(): ChatGPTHookReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usage, setUsage] = useState<{
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | null>(null)

  const sendMessage = useCallback(async (message: string, context?: string): Promise<string> => {
    setLoading(true)
    setError(null)
    setUsage(null)

    try {
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      if (data.usage) {
        setUsage(data.usage)
      }

      return data.response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const sendConversation = useCallback(async (
    messages: ChatGPTMessage[], 
    model: string = 'gpt-3.5-turbo', 
    maxTokens: number = 1000
  ): Promise<string> => {
    setLoading(true)
    setError(null)
    setUsage(null)

    try {
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          maxTokens
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      
      if (data.usage) {
        setUsage(data.usage)
      }

      return data.response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    sendMessage,
    sendConversation,
    loading,
    error,
    usage
  }
}