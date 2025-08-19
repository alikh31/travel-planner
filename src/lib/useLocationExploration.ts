import { useState } from 'react'

interface LocationExplorationResponse {
  phase: string
  prompt: any[]
  response: string
  itineraryData: {
    destination: string
    travelDates: string
    tripDuration: string
    accommodationDetails: string
    activityDetails: string
    userLocation: string
    tripType: string
  }
}

export function useLocationExploration() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exploreLocations = async (
    itineraryId: string,
    phase: 'exploration' | 'recommendation',
    accommodations?: any[],
    placesApiResults?: any[]
  ): Promise<LocationExplorationResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const body: any = {
        itineraryId,
        phase
      }

      // Include accommodations since they're stored in localStorage
      if (accommodations) {
        body.accommodations = accommodations
      }

      // Include Places API results for recommendation phase
      if (phase === 'recommendation' && placesApiResults) {
        body.placesApiResults = placesApiResults
      }

      const response = await fetch('/api/chatgpt/explore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to explore locations')
      }

      const data = await response.json()
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const fetchItineraryData = async (itineraryId: string) => {
    try {
      const response = await fetch(`/api/chatgpt/explore?itineraryId=${itineraryId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch itinerary data')
      }

      const data = await response.json()
      return data.itinerary
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      return null
    }
  }

  return {
    exploreLocations,
    fetchItineraryData,
    loading,
    error
  }
}