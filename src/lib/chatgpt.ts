import OpenAI from 'openai'

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatGPTResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Send a message to ChatGPT and get a response
 * @param messages - Array of messages for the conversation
 * @param model - OpenAI model to use (default: gpt-3.5-turbo)
 * @param maxTokens - Maximum number of tokens in response (default: 1000)
 * @returns Promise with ChatGPT response
 */
export async function sendToChatGPT(
  messages: ChatGPTMessage[],
  model: string = 'gpt-3.5-turbo',
  maxTokens: number = 1000
): Promise<ChatGPTResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    })

    const choice = completion.choices[0]
    if (!choice?.message?.content) {
      throw new Error('No response received from ChatGPT')
    }

    return {
      content: choice.message.content,
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens
      } : undefined
    }
  } catch (error) {
    console.error('ChatGPT API error:', error)
    throw new Error('Failed to get response from ChatGPT')
  }
}

/**
 * Helper function to create travel-related prompts
 */
export function createTravelPrompt(userMessage: string, context?: string): ChatGPTMessage[] {
  const systemMessage: ChatGPTMessage = {
    role: 'system',
    content: `You are a helpful travel planning assistant. You provide practical, accurate, and personalized travel advice. 
    Focus on specific recommendations for activities, accommodations, restaurants, transportation, and local insights.
    Always consider budget, time constraints, and traveler preferences when making suggestions.
    ${context ? `Additional context: ${context}` : ''}`
  }

  const userMsg: ChatGPTMessage = {
    role: 'user',
    content: userMessage
  }

  return [systemMessage, userMsg]
}