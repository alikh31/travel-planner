import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { sendToChatGPT } from '@/lib/chatgpt'
import { createLocationExplorationPrompt, createLocationRecommendationPrompt } from '@/lib/chatgpt-prompts'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { itineraryId, phase, placesApiResults } = body

    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 })
    }

    // Fetch itinerary from database with all related data
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        days: {
          include: {
            activities: {
              include: {
                comments: true,
                votes: true
              }
            }
          }
        },
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Check if user is a member of this itinerary
    const isMember = itinerary.members.some(member => member.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to access this itinerary' }, { status: 403 })
    }

    // Extract comprehensive itinerary information
    const destination = itinerary.destination || 'Unknown destination'
    const startDate = itinerary.startDate ? new Date(itinerary.startDate) : null
    const endDate = itinerary.endDate ? new Date(itinerary.endDate) : null
    
    // Format travel dates
    let travelDates = 'Dates not specified'
    let tripDuration = 'Unknown duration'
    if (startDate && endDate) {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      tripDuration = `${days} days`
      travelDates = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
    }

    // Since accommodations are currently stored in localStorage, 
    // we'll pass them from the frontend for now
    // In a future update, these should be stored in the database
    const accommodations = body.accommodations || []
    
    // Get detailed accommodation information
    let accommodationDetails = 'No accommodation specified'
    if (accommodations && accommodations.length > 0) {
      const accommodationList = accommodations.map((acc: any) => {
        const details = []
        details.push(`Name: ${acc.name || 'Unnamed accommodation'}`)
        if (acc.type) details.push(`Type: ${acc.type}`)
        if (acc.location) details.push(`Location: ${acc.location}`)
        if (acc.checkIn) details.push(`Check-in: ${acc.checkIn}`)
        if (acc.checkOut) details.push(`Check-out: ${acc.checkOut}`)
        if (acc.nights) details.push(`Nights: ${acc.nights}`)
        if (acc.guests) details.push(`Guests: ${acc.guests}`)
        if (acc.amenities && acc.amenities.length > 0) {
          details.push(`Amenities: ${acc.amenities.join(', ')}`)
        }
        if (acc.notes) details.push(`Notes: ${acc.notes}`)
        return details.join(', ')
      }).join('\n')
      accommodationDetails = accommodationList
    }

    // Get detailed activity information with days and times
    let activityDetails = 'No activities planned'
    if (itinerary.days && itinerary.days.length > 0) {
      const activityList = itinerary.days.map((day, dayIndex) => {
        if (!day.activities || day.activities.length === 0) {
          return `Day ${dayIndex + 1} (${new Date(day.date).toLocaleDateString()}): No activities planned`
        }
        
        const dayActivities = day.activities.map(activity => {
          const details = []
          details.push(activity.title || 'Unnamed activity')
          if (activity.startTime) details.push(`at ${activity.startTime}`)
          if (activity.duration) details.push(`(${activity.duration} minutes)`)
          if (activity.location) details.push(`(${activity.location})`)
          if (activity.description) details.push(`- ${activity.description}`)
          return `  • ${details.join(' ')}`
        }).join('\n')
        
        return `Day ${dayIndex + 1} (${new Date(day.date).toLocaleDateString()}):\n${dayActivities}`
      }).join('\n\n')
      activityDetails = activityList
    }

    // Get user location information from session or user profile
    const userLocation = 'Location not specified'
    // You could fetch this from user profile if stored there
    // For now, we'll use a placeholder
    
    const tripType = itinerary.description || 'General travel'

    // Generate appropriate prompt based on phase
    let messages
    let responseData

    if (phase === 'exploration') {
      // Phase 1: Location exploration/discovery
      messages = createLocationExplorationPrompt(
        destination,
        tripDuration,
        accommodationDetails,
        activityDetails,
        userLocation,
        travelDates,
        tripType
      )

      const response = await sendToChatGPT(
        messages,
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        1500
      )

      responseData = {
        phase: 'exploration',
        prompt: messages,
        response: response.content,
        itineraryData: {
          destination,
          travelDates,
          tripDuration,
          accommodationDetails,
          activityDetails,
          userLocation,
          tripType
        }
      }
    } else if (phase === 'recommendation' && placesApiResults) {
      // Phase 2: Location recommendations based on Places API results
      messages = createLocationRecommendationPrompt(
        destination,
        placesApiResults,
        {
          duration: tripDuration,
          accommodationDetails,
          activityDetails,
          userLocation,
          travelDates,
          tripType
        }
      )

      const response = await sendToChatGPT(
        messages,
        process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        2000
      )

      responseData = {
        phase: 'recommendation',
        prompt: messages,
        response: response.content,
        itineraryData: {
          destination,
          travelDates,
          tripDuration,
          accommodationDetails,
          activityDetails,
          userLocation,
          tripType
        }
      }
    } else {
      return NextResponse.json({ 
        error: 'Invalid phase. Use "exploration" for phase 1 or "recommendation" with placesApiResults for phase 2' 
      }, { status: 400 })
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Location exploration API error:', error)
    return NextResponse.json(
      { error: 'Failed to process location exploration request' },
      { status: 500 }
    )
  }
}

// GET endpoint to fetch itinerary data for display
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itineraryId = searchParams.get('itineraryId')

    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 })
    }

    // Fetch itinerary from database with all related data
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
      include: {
        days: {
          include: {
            activities: true
          }
        },
        members: {
          include: {
            user: true
          }
        }
      }
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Check if user is a member
    const isMember = itinerary.members.some(member => member.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Not authorized to access this itinerary' }, { status: 403 })
    }

    return NextResponse.json({ itinerary })

  } catch (error) {
    console.error('Error fetching itinerary data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch itinerary data' },
      { status: 500 }
    )
  }
}