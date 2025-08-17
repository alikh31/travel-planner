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
    const { name, location, checkIn, checkOut, nights, guests, cost, notes, bookingRef, photoUrl } = body

    // Check if user has permission to edit this accommodation
    const accommodation = await prisma.accommodation.findFirst({
      where: {
        id,
        itinerary: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!accommodation) {
      return NextResponse.json(
        { error: 'Accommodation not found or insufficient permissions' },
        { status: 404 }
      )
    }

    const updatedAccommodation = await prisma.accommodation.update({
      where: { id },
      data: {
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

    return NextResponse.json(updatedAccommodation)
  } catch (error) {
    console.error('Error updating accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to update accommodation' },
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

    // Check if user has permission to delete this accommodation
    const accommodation = await prisma.accommodation.findFirst({
      where: {
        id,
        itinerary: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!accommodation) {
      return NextResponse.json(
        { error: 'Accommodation not found or insufficient permissions' },
        { status: 404 }
      )
    }

    await prisma.accommodation.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Accommodation deleted successfully' })
  } catch (error) {
    console.error('Error deleting accommodation:', error)
    return NextResponse.json(
      { error: 'Failed to delete accommodation' },
      { status: 500 }
    )
  }
}