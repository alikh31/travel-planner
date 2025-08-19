import OpenAI from 'openai'

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Re-export from the client-safe prompts file
export type { ChatGPTMessage } from './chatgpt-prompts'
export { createTravelPrompt, createLocationExplorationPrompt, createLocationRecommendationPrompt } from './chatgpt-prompts'

// Import for local use
import type { ChatGPTMessage } from './chatgpt-prompts'

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
  model: string = process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  maxTokens: number = 1000
): Promise<ChatGPTResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }

  try {
    // Build completion parameters based on model capabilities
    const completionParams: any = {
      model,
      messages,
    }

    // Set temperature (some models like gpt-5-mini only support default temperature of 1)
    if (!model.includes('gpt-5')) {
      completionParams.temperature = 0.7
    }

    // Set token limit parameter based on model
    if (model.includes('gpt-4o') || model.includes('gpt-5') || model.includes('o1')) {
      completionParams.max_completion_tokens = maxTokens
    } else {
      completionParams.max_tokens = maxTokens
    }

    const completion = await openai.chat.completions.create(completionParams)

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

