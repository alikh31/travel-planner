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
    const { activityId, content } = body

    if (!activityId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Activity ID and content are required' },
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

    const comment = await prisma.comment.create({
      data: {
        activityId,
        userId: session.user.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('activityId')

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
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

    const comments = await prisma.comment.findMany({
      where: { activityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}