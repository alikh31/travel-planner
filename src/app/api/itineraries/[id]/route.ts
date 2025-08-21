import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
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
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        accommodations: {
          orderBy: {
            checkIn: 'asc',
          },
        },
        days: {
          include: {
            activities: {
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
              orderBy: {
                startTime: 'asc',
              },
            },
          },
          orderBy: {
            dayIndex: 'asc',
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    return NextResponse.json(itinerary)
  } catch (error) {
    console.error('Error fetching itinerary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch itinerary' },
      { status: 500 }
    )
  }
}

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
    const { title, description, destination, startDate, endDate } = body

    // Check if user has permission to edit
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
    })

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found or insufficient permissions' },
        { status: 404 }
      )
    }

    const updatedItinerary = await prisma.itinerary.update({
      where: { id },
      data: {
        title,
        description,
        destination,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      include: {
        creator: true,
        members: {
          include: {
            user: true,
          },
        },
        days: {
          include: {
            activities: {
              include: {
                suggestions: true,
                votes: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(updatedItinerary)
  } catch (error) {
    console.error('Error updating itinerary:', error)
    return NextResponse.json(
      { error: 'Failed to update itinerary' },
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
    // Check if user is the creator
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id,
        createdBy: session.user.id,
      },
    })

    if (!itinerary) {
      return NextResponse.json(
        { error: 'Itinerary not found or insufficient permissions' },
        { status: 404 }
      )
    }

    await prisma.itinerary.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Itinerary deleted successfully' })
  } catch (error) {
    console.error('Error deleting itinerary:', error)
    return NextResponse.json(
      { error: 'Failed to delete itinerary' },
      { status: 500 }
    )
  }
}