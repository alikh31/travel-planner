import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/user-activity - Start tracking a place view
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      itineraryId, 
      sessionId, 
      placeId, 
      placeName, 
      placeIndex, 
      dayId,
      isGptSuggestion,
      gptCategory,
      searchSource
    } = await request.json()

    if (!itineraryId || !sessionId || !placeId || !placeName || placeIndex === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    // Check if activity already exists for this session/place
    const existingActivity = await prisma.userActivity.findFirst({
      where: {
        userId: session.user.id,
        sessionId,
        placeId,
        itineraryId
      }
    })

    if (existingActivity) {
      // Update existing activity with new view start time
      const activity = await prisma.userActivity.update({
        where: { id: existingActivity.id },
        data: {
          viewStartTime: new Date(),
          viewEndTime: null,
          totalViewTime: null
        }
      })
      
      return NextResponse.json({ success: true, activityId: activity.id })
    }

    // Create new activity record
    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        itineraryId,
        sessionId,
        placeId,
        placeName,
        placeIndex,
        viewStartTime: new Date(),
        dayId,
        isGptSuggestion: isGptSuggestion || false,
        gptCategory: gptCategory || null,
        searchSource: searchSource || null
      }
    })

    return NextResponse.json({ success: true, activityId: activity.id })

  } catch (error) {
    console.error('Error creating user activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/user-activity - Update activity (end view, add interactions)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      activityId,
      sessionId,
      placeId,
      imageSlides,
      addedToWishlist,
      timeToWishlist,
      endView = false
    } = await request.json()

    if (!activityId && (!sessionId || !placeId)) {
      return NextResponse.json({ 
        error: 'Must provide either activityId or sessionId+placeId' 
      }, { status: 400 })
    }

    // Find activity by ID or session+place
    let activity
    if (activityId) {
      activity = await prisma.userActivity.findFirst({
        where: {
          id: activityId,
          userId: session.user.id
        }
      })
    } else {
      activity = await prisma.userActivity.findFirst({
        where: {
          userId: session.user.id,
          sessionId,
          placeId
        }
      })
    }

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    
    if (imageSlides !== undefined) {
      updateData.imageSlides = imageSlides
    }
    
    if (addedToWishlist !== undefined) {
      updateData.addedToWishlist = addedToWishlist
    }
    
    if (timeToWishlist !== undefined) {
      updateData.timeToWishlist = timeToWishlist
    }
    
    if (endView) {
      const now = new Date()
      updateData.viewEndTime = now
      
      // Calculate total view time
      if (activity.viewStartTime) {
        const totalTime = now.getTime() - activity.viewStartTime.getTime()
        updateData.totalViewTime = totalTime
      }
    }

    const updatedActivity = await prisma.userActivity.update({
      where: { id: activity.id },
      data: updateData
    })

    return NextResponse.json({ success: true, activity: updatedActivity })

  } catch (error) {
    console.error('Error updating user activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/user-activity - Get user activity analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itineraryId = searchParams.get('itineraryId')
    const sessionId = searchParams.get('sessionId')

    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 })
    }

    const whereClause: any = {
      userId: session.user.id,
      itineraryId
    }

    if (sessionId) {
      whereClause.sessionId = sessionId
    }

    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      orderBy: [
        { sessionId: 'desc' },
        { placeIndex: 'asc' }
      ]
    })

    return NextResponse.json({ success: true, activities })

  } catch (error) {
    console.error('Error fetching user activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}