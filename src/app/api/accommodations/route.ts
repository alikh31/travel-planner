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
    const { itineraryId, name, location, checkIn, checkOut, nights, guests, cost, notes, bookingRef, photoUrl } = body

    // Check if user has permission to add accommodations to this itinerary
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id: itineraryId,
        members: {
          some: {
            userId: session.user.id,
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

    const accommodation = await prisma.accommodation.create({
      data: {
        itineraryId,
        name,
        location,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        nights,
        guests: guests || 1,
        cost: cost ? parseFloat(cost) : null,
        notes,
        bookingRef,
        photoUrl,
      },
    })

    return NextResponse.json(accommodation)
  } catch (error) {
    console.error('Error creating accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to create accommodation' },
      { status: 500 }
    )
  }
}