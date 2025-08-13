import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams
    const body = await request.json()
    const {
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

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this activity
    const existingActivity = await prisma.activity.findFirst({
      where: {
        id,
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

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user is the creator or has admin rights
    const isCreator = existingActivity.createdBy === session.user.id
    const isAdmin = await prisma.groupMember.findFirst({
      where: {
        userId: session.user.id,
        itinerary: {
          days: {
            some: {
              activities: {
                some: {
                  id,
                },
              },
            },
          },
        },
        role: 'admin',
      },
    })

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only edit activities you created or if you are an admin' },
        { status: 403 }
      )
    }

    const updatedActivity = await prisma.activity.update({
      where: { id },
      data: {
        title,
        description: description || null,
        location: location || null,
        locationPlaceId: locationPlaceId || null,
        locationLat: locationLat || null,
        locationLng: locationLng || null,
        startTime: startTime || null,
        duration: duration || null,
        cost: cost || null,
        isGroupActivity: isGroupActivity ?? true,
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
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    return NextResponse.json(updatedActivity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json(
      { error: 'Failed to update activity' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await context.params
    const { id } = resolvedParams

    // Verify user has access to this activity
    const existingActivity = await prisma.activity.findFirst({
      where: {
        id,
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

    if (!existingActivity) {
      return NextResponse.json(
        { error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user is the creator or has admin rights
    const isCreator = existingActivity.createdBy === session.user.id
    const isAdmin = await prisma.groupMember.findFirst({
      where: {
        userId: session.user.id,
        itinerary: {
          days: {
            some: {
              activities: {
                some: {
                  id,
                },
              },
            },
          },
        },
        role: 'admin',
      },
    })

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete activities you created or if you are an admin' },
        { status: 403 }
      )
    }

    await prisma.activity.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    )
  }
}