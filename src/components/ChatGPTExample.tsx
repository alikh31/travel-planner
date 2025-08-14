'use client'

import { useState } from 'react'
import { useChatGPT } from '@/lib/useChatGPT'
import { MessageCircle, Send, Loader2 } from 'lucide-react'

export default function ChatGPTExample() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const { sendMessage, loading, error, usage } = useChatGPT()

  const handleSend = async () => {
    if (!message.trim()) return

    try {
      const result = await sendMessage(message, 'Travel planning assistant')
      setResponse(result)
      setMessage('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center mb-4">
        <MessageCircle className="h-6 w-6 text-ocean-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Travel AI Assistant</h3>
      </div>

      <div className="space-y-4">
        {/* Input */}
        <div className="flex gap-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about travel planning..."
            className="flex-1 min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-blue-500 focus:border-transparent resize-none"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            className="px-4 py-2 bg-ocean-blue-600 text-white rounded-lg hover:bg-ocean-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Thinking...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">AI Response:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
            
            {/* Usage stats */}
            {usage && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Tokens used: {usage.total_tokens} (prompt: {usage.prompt_tokens}, response: {usage.completion_tokens})
                </p>
              </div>
            )}
          </div>
        )}

        {/* Example prompts */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Try these examples:</h4>
          <div className="flex flex-wrap gap-2">
            {[
              "Plan a 3-day trip to Paris",
              "Best restaurants in Tokyo",
              "Budget backpacking in Southeast Asia",
              "Family-friendly activities in London"
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setMessage(example)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                disabled={loading}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}