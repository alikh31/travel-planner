'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useLocationExploration } from '@/lib/useLocationExploration'
import { useChatGPT } from '@/lib/useChatGPT'
import { MessageCircle, Send, Loader2, MapPin, Search } from 'lucide-react'

interface ChatMessage {
  id: string
  type: 'request' | 'response'
  content: string
  timestamp: Date
}

export default function ExplorePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const itineraryId = params.id as string
  const selectedDay = searchParams.get('day') || '1'
  
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [modelInfo, setModelInfo] = useState<string>('Loading...')
  
  // Itinerary data state
  const [itinerary, setItinerary] = useState<any>(null)
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [itineraryLoading, setItineraryLoading] = useState(true)
  const [itineraryData, setItineraryData] = useState<any>(null)
  
  // Location exploration state
  const [mockPlacesData, setMockPlacesData] = useState('')
  
  const { sendMessage, loading: chatLoading, error: chatError } = useChatGPT()
  const { exploreLocations, fetchItineraryData, loading: exploreLoading, error: exploreError } = useLocationExploration()

  useEffect(() => {
    // Fetch model info from health check endpoint
    fetch('/api/chatgpt')
      .then(res => res.json())
      .then(data => {
        setModelInfo(data.openai_model || 'gpt-3.5-turbo')
      })
      .catch(() => {
        setModelInfo('Unknown')
      })
  }, [])

  useEffect(() => {
    // Fetch itinerary data from backend
    const loadItineraryData = async () => {
      try {
        setItineraryLoading(true)
        
        // Fetch itinerary details from backend API
        const itinData = await fetchItineraryData(itineraryId)
        if (itinData) {
          setItinerary(itinData)
        }

        // Still fetch accommodations from localStorage since they're not in DB yet
        const accommodationData = localStorage.getItem(`accommodations-${itineraryId}`)
        if (accommodationData) {
          const parsedAccommodations = JSON.parse(accommodationData)
          setAccommodations(parsedAccommodations)
        }

      } catch (error) {
        console.error('Error fetching itinerary data:', error)
      } finally {
        setItineraryLoading(false)
      }
    }

    loadItineraryData()
  }, [itineraryId])

  const handleSend = async () => {
    if (!message.trim() || chatLoading) return

    const requestId = Date.now().toString()
    const requestMessage: ChatMessage = {
      id: requestId,
      type: 'request',
      content: message,
      timestamp: new Date()
    }

    setChatHistory(prev => [...prev, requestMessage])
    const currentMessage = message
    setMessage('')

    try {
      const context = `User is exploring itinerary ${itineraryId} for day ${selectedDay}. Provide travel suggestions and information.`
      const response = await sendMessage(currentMessage, context)
      
      const responseMessage: ChatMessage = {
        id: `${requestId}_response`,
        type: 'response',
        content: response,
        timestamp: new Date()
      }

      setChatHistory(prev => [...prev, responseMessage])
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `${requestId}_error`,
        type: 'response',
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearHistory = () => {
    setChatHistory([])
  }

  // Phase 1: Get location search terms from GPT
  const handleLocationDiscovery = async () => {
    if (!itinerary || exploreLoading) return

    const requestId = Date.now().toString()
    
    try {
      // Call backend API for exploration phase
      const response = await exploreLocations(
        itineraryId, 
        'exploration',
        accommodations // Pass accommodations since they're in localStorage
      )

      if (response) {
        setItineraryData(response.itineraryData)
        
        // Add request to chat history
        const requestMessage: ChatMessage = {
          id: requestId,
          type: 'request',
          content: `PHASE 1 - LOCATION DISCOVERY\n\nSystem Prompt:\n${response.prompt[0].content}\n\nUser Message:\n${response.prompt[1].content}`,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, requestMessage])

        // Add response to chat history
        const responseMessage: ChatMessage = {
          id: `${requestId}_response`,
          type: 'response',
          content: `PHASE 1 RESPONSE - Search Terms:\n\n${response.response}`,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, responseMessage])
      }

    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `${requestId}_error`,
        type: 'response',
        content: `Error in Phase 1: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    }
  }

  // Phase 2: Get location recommendations from Places API results
  const handleLocationRecommendations = async () => {
    if (!itinerary || !mockPlacesData.trim() || exploreLoading) return

    const requestId = Date.now().toString()
    
    try {
      // Parse mock Places API data
      let placesApiResults
      try {
        placesApiResults = JSON.parse(mockPlacesData)
      } catch (parseError) {
        throw new Error('Invalid JSON format in Places API data')
      }

      // Call backend API for recommendation phase
      const response = await exploreLocations(
        itineraryId,
        'recommendation',
        accommodations,
        placesApiResults
      )

      if (response) {
        // Add request to chat history
        const requestMessage: ChatMessage = {
          id: requestId,
          type: 'request',
          content: `PHASE 2 - LOCATION RECOMMENDATIONS\n\nSystem Prompt:\n${response.prompt[0].content}\n\nUser Message:\n${response.prompt[1].content}`,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, requestMessage])

        // Add response to chat history
        const responseMessage: ChatMessage = {
          id: `${requestId}_response`,
          type: 'response',
          content: `PHASE 2 RESPONSE - Top 20 Recommendations:\n\n${response.response}`,
          timestamp: new Date()
        }
        setChatHistory(prev => [...prev, responseMessage])
      }

    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `${requestId}_error`,
        type: 'response',
        content: `Error in Phase 2: ${err instanceof Error ? err.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      }
      setChatHistory(prev => [...prev, errorMessage])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-ocean-blue-600 mr-2" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">GPT Test Page</h1>
                <p className="text-sm text-gray-500">
                  Itinerary: {itineraryId} | Day: {selectedDay} | Model: {modelInfo}
                </p>
              </div>
            </div>
            <button
              onClick={clearHistory}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear History
            </button>
          </div>

          {/* Location Exploration Controls */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Location Exploration Flow
            </h2>
            
            {/* Phase 1: Location Discovery */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Phase 1: Location Discovery (Auto-populated from Database)
              </h3>
              
              {itineraryLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading itinerary data...</span>
                </div>
              ) : (
                <>
                  {/* Display extracted itinerary data */}
                  <div className="mb-4 p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-800 mb-3">Data from Backend:</h4>
                    {itineraryData ? (
                      <div className="space-y-3 text-sm">
                        <div><strong>Destination:</strong> {itineraryData.destination}</div>
                        <div><strong>Travel Dates:</strong> {itineraryData.travelDates}</div>
                        <div><strong>Duration:</strong> {itineraryData.tripDuration}</div>
                        <div><strong>Traveler Location:</strong> {itineraryData.userLocation}</div>
                        <div><strong>Trip Type:</strong> {itineraryData.tripType}</div>
                        <div><strong>Accommodation Details:</strong><br />
                          <pre className="mt-1 text-xs font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap">{itineraryData.accommodationDetails}</pre>
                        </div>
                        <div><strong>Current Activities:</strong><br />
                          <pre className="mt-1 text-xs font-mono bg-gray-50 p-2 rounded whitespace-pre-wrap">{itineraryData.activityDetails}</pre>
                        </div>
                      </div>
                    ) : itinerary ? (
                      <p className="text-gray-600">Click &quot;Send to GPT&quot; to fetch and display itinerary data</p>
                    ) : (
                      <p className="text-red-600">Unable to load itinerary data</p>
                    )}
                  </div>

                  <button
                    onClick={handleLocationDiscovery}
                    disabled={exploreLoading || !itinerary}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {exploreLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Send to GPT-5-mini (Backend)
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Phase 2: Location Recommendations */}
            <div className="border-t border-blue-300 pt-6">
              <h3 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Phase 2: Location Recommendations (Using database context + Places API data)
              </h3>
              
              <div className="mb-4 p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-800 mb-2">Context from Phase 1:</h4>
                <p className="text-sm text-gray-600">
                  This phase will use the same itinerary information from the database, plus the Google Places API results below, 
                  to generate curated recommendations.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mock Google Places API Results (JSON format) *
                </label>
                <textarea
                  value={mockPlacesData}
                  onChange={(e) => setMockPlacesData(e.target.value)}
                  placeholder='[{"name": "Louvre Museum", "rating": 4.6, "types": ["museum"], "vicinity": "Rue de Rivoli"}, {"name": "Seine River Cruise", "rating": 4.4, "types": ["tourist_attraction"], "vicinity": "Pont Neuf"}]'
                  className="w-full h-32 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste mock Google Places API results here. In a real implementation, this would come from the Google Places API using search terms from Phase 1.
                </p>
              </div>
              
              <div className="flex gap-2 items-center">
                <button
                  onClick={handleLocationRecommendations}
                  disabled={exploreLoading || !itinerary || !mockPlacesData.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {exploreLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Send to GPT-5-mini for Top 20 (Backend)
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setMockPlacesData(JSON.stringify([
                      {"name": "Louvre Museum", "rating": 4.6, "types": ["museum"], "vicinity": "Rue de Rivoli", "place_id": "ChIJD3uTd9hx5kcR1IQvGfr8dbk"},
                      {"name": "Notre-Dame Cathedral", "rating": 4.4, "types": ["church", "tourist_attraction"], "vicinity": "6 Parvis Notre-Dame", "place_id": "ChIJATr1n-Fx5kcRjQb5fmh_ZwE"},
                      {"name": "Marché des Enfants Rouges", "rating": 4.2, "types": ["food", "market"], "vicinity": "39 Rue de Bretagne", "place_id": "ChIJNYjTKphx5kcRk4jkbvvLdXc"},
                      {"name": "Seine River Cruise", "rating": 4.4, "types": ["tourist_attraction", "travel_agency"], "vicinity": "Port de Solférino", "place_id": "ChIJrTLr-GyuEmsRBfy61i59si0"},
                      {"name": "Sacré-Cœur", "rating": 4.5, "types": ["church", "tourist_attraction"], "vicinity": "35 Rue du Chevalier de la Barre", "place_id": "ChIJATr1n-Fx5kcRjQb5fmh_ZwE"}
                    ], null, 2))
                  }}
                  className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  Fill Sample Data
                </button>
              </div>
            </div>
          </div>

          {/* Chat History */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No messages yet. Start a conversation with ChatGPT.
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg border ${
                    msg.type === 'request'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${
                      msg.type === 'request' ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                      {msg.type === 'request' ? 'REQUEST' : 'RESPONSE'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {msg.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 bg-white p-3 rounded border">
{msg.content}
                  </pre>
                </div>
              ))
            )}
          </div>

          {/* Error Display */}
          {(chatError || exploreError) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">Error: {chatError || exploreError}</p>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask ChatGPT about your travel plans..."
                className="flex-1 min-h-[80px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ocean-blue-500 focus:border-transparent resize-none"
                disabled={chatLoading}
              />
              <button
                onClick={handleSend}
                disabled={chatLoading || !message.trim()}
                className="px-4 py-2 bg-ocean-blue-600 text-white rounded-lg hover:bg-ocean-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {chatLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="hidden sm:inline">Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Example Prompts */}
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Try these examples:</h4>
            <div className="flex flex-wrap gap-2">
              {[
                `What are the best activities for day ${selectedDay}?`,
                "Give me Google Maps search terms for interesting neighborhoods to explore",
                "Suggest locations I should add to my itinerary with search terms for Google Maps",
                "What are the must-visit cultural areas I should search for on Google Maps?",
                "Recommend food markets and dining areas with specific location search terms"
              ].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(example)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  disabled={chatLoading}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}