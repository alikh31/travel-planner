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
      activityId,
      title,
      description,
      location,
      estimatedCost
    } = body

    if (!activityId || !title) {
      return NextResponse.json(
        { error: 'Activity ID and title are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this activity
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        day: {
          itinerary: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    })

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    const suggestion = await prisma.suggestion.create({
      data: {
        activityId,
        title,
        description: description || null,
        location: location || null,
        estimatedCost: estimatedCost || null,
        suggestedBy: session.user.id,
      },
      include: {
        suggester: true,
        votes: true,
      },
    })

    return NextResponse.json(suggestion)
  } catch (error) {
    console.error('Error creating suggestion:', error)
    return NextResponse.json(
      { error: 'Failed to create suggestion' },
      { status: 500 }
    )
  }
}