import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
    const { type } = body

    if (!type || (type !== 'up' && type !== 'down')) {
      return NextResponse.json(
        { error: 'Vote type must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Verify user has access to this activity
    const activity = await prisma.activity.findFirst({
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

    if (!activity) {
      return NextResponse.json(
        { error: 'Activity not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user has already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: session.user.id,
        activityId: id,
      },
    })

    if (existingVote) {
      if (existingVote.type === type) {
        // Remove vote if clicking the same type
        await prisma.vote.delete({
          where: { id: existingVote.id },
        })
      } else {
        // Update vote if clicking different type
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type },
        })
      }
    } else {
      // Create new vote
      await prisma.vote.create({
        data: {
          userId: session.user.id,
          activityId: id,
          type,
        },
      })
    }

    // Return updated activity with votes
    const updatedActivity = await prisma.activity.findUnique({
      where: { id },
      include: {
        votes: true,
        creator: true,
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
    console.error('Error voting:', error)
    return NextResponse.json(
      { error: 'Failed to process vote' },
      { status: 500 }
    )
  }
}