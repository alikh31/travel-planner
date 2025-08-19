import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/wishlist - Get user's wishlist items for a specific itinerary
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itineraryId = searchParams.get('itineraryId')

    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 })
    }

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: {
        userId: session.user.id,
        itineraryId: itineraryId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ success: true, items: wishlistItems })

  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/wishlist - Add item to wishlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { placeId, placeName, placeVicinity, placeRating, placePhotoReference, itineraryId } = await request.json()

    if (!placeId || !placeName || !itineraryId) {
      return NextResponse.json({ error: 'Place ID, name, and itinerary ID are required' }, { status: 400 })
    }

    // Check if item already exists
    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_placeId_itineraryId: {
          userId: session.user.id,
          placeId: placeId,
          itineraryId: itineraryId
        }
      }
    })

    if (existingItem) {
      return NextResponse.json({ error: 'Item already in wishlist' }, { status: 409 })
    }

    const wishlistItem = await prisma.wishlistItem.create({
      data: {
        userId: session.user.id,
        placeId,
        placeName,
        placeVicinity,
        placeRating,
        placePhotoReference,
        itineraryId
      }
    })

    return NextResponse.json({ success: true, item: wishlistItem })

  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/wishlist - Remove item from wishlist
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const placeId = searchParams.get('placeId')
    const itineraryId = searchParams.get('itineraryId')

    if (!placeId || !itineraryId) {
      return NextResponse.json({ error: 'Place ID and itinerary ID are required' }, { status: 400 })
    }

    const deletedItem = await prisma.wishlistItem.deleteMany({
      where: {
        userId: session.user.id,
        placeId: placeId,
        itineraryId: itineraryId
      }
    })

    if (deletedItem.count === 0) {
      return NextResponse.json({ error: 'Item not found in wishlist' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Item removed from wishlist' })

  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}