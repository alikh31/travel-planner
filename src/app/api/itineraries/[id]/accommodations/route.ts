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
    const { id: itineraryId } = resolvedParams
    
    // Get the date from query params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 })
    }

    // Check if user has access to this itinerary
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
      return NextResponse.json({ error: 'Itinerary not found' }, { status: 404 })
    }

    // Fetch accommodations for this itinerary
    const accommodations = await prisma.accommodation.findMany({
      where: {
        itineraryId,
      },
      orderBy: {
        checkIn: 'asc',
      },
    })

    // Find accommodation that covers the requested date
    const targetDate = new Date(date)
    const accommodation = accommodations.find(acc => {
      const checkInDate = new Date(acc.checkIn)
      const checkOutDate = new Date(acc.checkOut)
      return targetDate >= checkInDate && targetDate < checkOutDate
    })

    return NextResponse.json({ accommodation: accommodation || null })
  } catch (error) {
    console.error('Error fetching accommodation for date:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accommodation' },
      { status: 500 }
    )
  }
}