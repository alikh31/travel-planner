import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendToChatGPT, createTravelPrompt, ChatGPTMessage } from '@/lib/chatgpt'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { message, messages, model, maxTokens, context } = body

    // Validate required fields
    if (!message && !messages) {
      return NextResponse.json(
        { error: 'Either message or messages array is required' },
        { status: 400 }
      )
    }

    let chatMessages: ChatGPTMessage[]

    if (messages) {
      // Use provided messages array for conversation history
      chatMessages = messages
    } else {
      // Create a new conversation with travel context
      chatMessages = createTravelPrompt(message, context)
    }

    // Send to ChatGPT
    const response = await sendToChatGPT(
      chatMessages,
      model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      maxTokens || 1000
    )

    return NextResponse.json({
      success: true,
      response: response.content,
      usage: response.usage
    })

  } catch (error) {
    console.error('ChatGPT API route error:', error)
    
    // Return appropriate error message
    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: 'OpenAI API key not configured' },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    
    return NextResponse.json({
      status: 'ok',
      openai_configured: hasApiKey,
      openai_model: model
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    )
  }
}