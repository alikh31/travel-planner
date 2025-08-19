// Client-safe prompt creation functions (no OpenAI client instantiation)

export interface ChatGPTMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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

/**
 * Helper function to create location exploration prompts for Google Maps Places API integration
 */
export function createLocationExplorationPrompt(
  destination: string,
  tripDuration?: string,
  accommodationDetails?: string,
  activityDetails?: string,
  userLocation?: string,
  travelDates?: string,
  tripType?: string
): ChatGPTMessage[] {
  const systemMessage: ChatGPTMessage = {
    role: 'system',
    content: `You are a travel location discovery specialist. Your job is to suggest interesting places and areas that travelers should explore in their destination.

Your role:
- Suggest specific neighborhoods, districts, and areas worth exploring
- Recommend types of locations (markets, viewpoints, cultural areas, entertainment districts, etc.)
- Provide search terms that work well with Google Maps Places API
- Consider the traveler's accommodation location, existing activities, and trip context

Response format:
Provide your suggestions as a list of Google Maps searchable terms. For each suggestion, use clear, specific location names or types that would return good results in Google Maps Places API.

Examples of good search terms:
- "Marais district, Paris"
- "street food markets in Bangkok"
- "sunset viewpoints in Santorini"
- "local coffee shops in Melbourne CBD"
- "historic temples in Kyoto"

Focus on:
1. Authentic local experiences
2. Must-see cultural sites
3. Food and dining areas
4. Shopping districts
5. Scenic locations
6. Entertainment/nightlife areas
7. Parks and outdoor spaces
8. Art and cultural districts

Keep suggestions practical and accessible for travelers.`
  }

  let contextualInfo = `Destination: ${destination}`
  
  if (userLocation) {
    contextualInfo += `\nTraveler's home location: ${userLocation}`
  }
  
  if (travelDates) {
    contextualInfo += `\nTravel dates: ${travelDates}`
  }
  
  if (tripDuration) {
    contextualInfo += `\nTrip duration: ${tripDuration}`
  }
  
  if (accommodationDetails) {
    contextualInfo += `\nAccommodation details:\n${accommodationDetails}`
  }
  
  if (activityDetails) {
    contextualInfo += `\nCurrently planned activities:\n${activityDetails}`
  }
  
  if (tripType) {
    contextualInfo += `\nTrip type: ${tripType}`
  }

  const userMsg: ChatGPTMessage = {
    role: 'user',
    content: `Please suggest locations and areas to explore based on this travel information:

${contextualInfo}

Provide a list of Google Maps searchable terms for places I should consider exploring. Focus on diverse experiences that complement the existing itinerary and accommodation location. Return 8-12 specific search terms that would work well with Google Maps Places API.`
  }

  return [systemMessage, userMsg]
}

/**
 * Helper function to create prompts for analyzing Google Maps Places API results and recommending top locations
 */
export function createLocationRecommendationPrompt(
  destination: string,
  placesApiResults: any[],
  tripContext?: {
    duration?: string
    accommodationDetails?: string
    activityDetails?: string
    userLocation?: string
    travelDates?: string
    tripType?: string
  }
): ChatGPTMessage[] {
  const systemMessage: ChatGPTMessage = {
    role: 'system',
    content: `You are a travel curation expert. Your job is to analyze location data from Google Maps Places API and recommend the best places for travelers to explore.

Your role:
- Analyze the provided location data (names, ratings, types, descriptions)
- Consider location diversity, quality, and traveler appeal
- Prioritize highly-rated, authentic, and unique experiences
- Consider geographic distribution to avoid clustering
- Factor in the trip context, existing activities, and accommodation location

Response format:
Return EXACTLY 20 recommendations in this JSON format:
{
  "recommendations": [
    {
      "name": "Location Name",
      "type": "Category (e.g., Cultural Site, Restaurant, Market, etc.)",
      "rating": 4.5,
      "reason": "Brief explanation why this is recommended (1-2 sentences)",
      "priority": "high/medium/low"
    }
  ]
}

Ranking criteria:
1. High ratings and quality
2. Unique or authentic experiences
3. Geographic diversity
4. Relevance to trip context and existing activities
5. Popular but not overly touristy
6. Accessibility and practical considerations

Ensure variety across categories: culture, food, shopping, nature, entertainment, local experiences.`
  }

  let contextInfo = `Trip destination: ${destination}\n`
  
  if (tripContext?.userLocation) {
    contextInfo += `Traveler's home location: ${tripContext.userLocation}\n`
  }
  
  if (tripContext?.travelDates) {
    contextInfo += `Travel dates: ${tripContext.travelDates}\n`
  }
  
  if (tripContext?.duration) {
    contextInfo += `Trip duration: ${tripContext.duration}\n`
  }
  
  if (tripContext?.accommodationDetails) {
    contextInfo += `Accommodation details:\n${tripContext.accommodationDetails}\n`
  }
  
  if (tripContext?.activityDetails) {
    contextInfo += `Currently planned activities:\n${tripContext.activityDetails}\n`
  }
  
  if (tripContext?.tripType) {
    contextInfo += `Trip type: ${tripContext.tripType}\n`
  }

  const userMsg: ChatGPTMessage = {
    role: 'user',
    content: `Please analyze these Google Maps Places API results and recommend the top 20 locations to explore:

${contextInfo}

Google Maps Places API Results:
${JSON.stringify(placesApiResults, null, 2)}

Return your analysis as a JSON object with exactly 20 recommendations, prioritizing the best locations based on quality, uniqueness, and relevance to the trip context and existing activities. Ensure good variety across different types of experiences.`
  }

  return [systemMessage, userMsg]
}