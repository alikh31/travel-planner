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
    const { suggestionId, activityId, type } = body

    if ((!suggestionId && !activityId) || !type) {
      return NextResponse.json(
        { error: 'Either suggestionId or activityId is required, along with type' },
        { status: 400 }
      )
    }

    if (type !== 'up' && type !== 'down') {
      return NextResponse.json(
        { error: 'Vote type must be "up" or "down"' },
        { status: 400 }
      )
    }

    // Verify user has access to vote on this item
    let hasAccess = false

    if (suggestionId) {
      const suggestion = await prisma.suggestion.findFirst({
        where: {
          id: suggestionId,
          activity: {
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
        },
      })
      hasAccess = !!suggestion
    }

    if (activityId && !hasAccess) {
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
      hasAccess = !!activity
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Item not found or access denied' },
        { status: 404 }
      )
    }

    // Check if user has already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: session.user.id,
        ...(suggestionId ? { suggestionId } : { activityId }),
      },
    })

    if (existingVote) {
      // Update existing vote
      const updatedVote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: { type },
      })
      return NextResponse.json(updatedVote)
    } else {
      // Create new vote
      const vote = await prisma.vote.create({
        data: {
          userId: session.user.id,
          suggestionId: suggestionId || null,
          activityId: activityId || null,
          type,
        },
      })
      return NextResponse.json(vote)
    }
  } catch (error) {
    console.error('Error creating/updating vote:', error)
    return NextResponse.json(
      { error: 'Failed to create/update vote' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const suggestionId = searchParams.get('suggestionId')
    const activityId = searchParams.get('activityId')

    if (!suggestionId && !activityId) {
      return NextResponse.json(
        { error: 'Either suggestionId or activityId is required' },
        { status: 400 }
      )
    }

    const vote = await prisma.vote.findFirst({
      where: {
        userId: session.user.id,
        ...(suggestionId ? { suggestionId } : { activityId }),
      },
    })

    if (!vote) {
      return NextResponse.json(
        { error: 'Vote not found' },
        { status: 404 }
      )
    }

    await prisma.vote.delete({
      where: { id: vote.id },
    })

    return NextResponse.json({ message: 'Vote removed successfully' })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json(
      { error: 'Failed to remove vote' },
      { status: 500 }
    )
  }
}