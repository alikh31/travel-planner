import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      dayId,
      title,
      description,
      location,
      locationPlaceId,
      locationLat,
      locationLng,
      startTime,
      duration,
      cost,
      isGroupActivity
    } = body

    if (!dayId || !title) {
      return NextResponse.json(
        { error: 'Day ID and title are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this day's itinerary
    const day = await prisma.day.findFirst({
      where: {
        id: dayId,
        itinerary: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!day) {
      return NextResponse.json(
        { error: 'Day not found or access denied' },
        { status: 404 }
      )
    }

    const activity = await prisma.activity.create({
      data: {
        dayId,
        title,
        description: description || null,
        location: location || null,
        locationPlaceId: locationPlaceId?.place_id || null,
        locationLat: locationLat || null,
        locationLng: locationLng || null,
        startTime: startTime || null,
        duration: duration || null,
        cost: cost || null,
        isGroupActivity: isGroupActivity ?? true,
        createdBy: session.user.id,
      },
      include: {
        creator: true,
        suggestions: {
          include: {
            suggester: true,
            votes: true,
          },
        },
        votes: true,
      },
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}