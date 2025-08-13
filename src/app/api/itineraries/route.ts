import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays, differenceInDays } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, destination, startDate, endDate } = body

    if (!title || !destination || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, destination, start date, and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      )
    }

    const itinerary = await prisma.itinerary.create({
      data: {
        title,
        description,
        destination,
        startDate: start,
        endDate: end,
        createdBy: session.user.id,
        members: {
          create: {
            userId: session.user.id,
            role: 'admin',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    const dayCount = differenceInDays(end, start) + 1
    const days = []

    for (let i = 0; i < dayCount; i++) {
      const dayDate = addDays(start, i)
      const day = await prisma.day.create({
        data: {
          itineraryId: itinerary.id,
          date: dayDate,
        },
      })
      days.push(day)
    }

    return NextResponse.json({ ...itinerary, days })
  } catch (error) {
    console.error('Error creating itinerary:', error)
    return NextResponse.json(
      { error: 'Failed to create itinerary' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itineraries = await prisma.itinerary.findMany({
      where: {
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(itineraries)
  } catch (error) {
    console.error('Error fetching itineraries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch itineraries' },
      { status: 500 }
    )
  }
}