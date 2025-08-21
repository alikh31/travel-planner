import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findFirstAvailableTimeSlot } from '@/lib/time-slot-finder'
import { getPlaceDetails } from '@/lib/google-maps-new'
import { getDayDate } from '@/lib/date-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      wishlistItemId, 
      itineraryId, 
      customStartTime, 
      customDayIndex, 
      customDuration 
    } = await request.json()

    if (!wishlistItemId || !itineraryId) {
      return NextResponse.json({ 
        error: 'Wishlist item ID and itinerary ID are required' 
      }, { status: 400 })
    }

    // Get the wishlist item
    const wishlistItem = await prisma.wishlistItem.findFirst({
      where: {
        id: wishlistItemId,
        userId: session.user.id
      }
    })

    if (!wishlistItem) {
      return NextResponse.json({ error: 'Wishlist item not found' }, { status: 404 })
    }

    // Get the itinerary with days and activities
    const itinerary = await prisma.itinerary.findFirst({
      where: {
        id: itineraryId,
        members: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        days: {
          orderBy: { dayIndex: 'asc' }
        }
      }
    })

    if (!itinerary) {
      return NextResponse.json({ error: 'Itinerary not found or access denied' }, { status: 404 })
    }

    // Get existing activities for time slot calculation
    const existingActivities = await prisma.activity.findMany({
      where: {
        day: {
          itineraryId: itineraryId
        }
      },
      select: {
        startTime: true,
        duration: true,
        dayIndex: true
      }
    })

    let targetDayIndex: number
    let targetStartTime: string
    let targetDuration: number

    if (customDayIndex !== undefined && customStartTime && customDuration) {
      // User provided custom values
      targetDayIndex = customDayIndex
      targetStartTime = customStartTime
      targetDuration = customDuration
    } else {
      // Find the first available time slot based on GPT suggestions
      const timeSlot = findFirstAvailableTimeSlot(
        wishlistItem.gptTimeframe,
        wishlistItem.gptDuration,
        existingActivities.map(a => ({
          startTime: a.startTime || '09:00',
          duration: a.duration || 60,
          dayIndex: a.dayIndex
        })),
        itinerary.days.map(d => ({
          dayIndex: d.dayIndex,
          date: getDayDate(itinerary.startDate, d.dayIndex)
        }))
      )

      if (!timeSlot) {
        return NextResponse.json({ 
          error: 'No available time slots found. Please try manually selecting a time.',
          availableDays: itinerary.days.map(d => ({
            dayIndex: d.dayIndex,
            date: getDayDate(itinerary.startDate, d.dayIndex)
          }))
        }, { status: 400 })
      }

      targetDayIndex = timeSlot.dayIndex
      targetStartTime = timeSlot.startTime
      targetDuration = wishlistItem.gptDuration || 60
    }

    // Find the target day
    const targetDay = itinerary.days.find(d => d.dayIndex === targetDayIndex)
    if (!targetDay) {
      return NextResponse.json({ error: 'Invalid day index' }, { status: 400 })
    }

    // Fetch place details for better description
    let enhancedDescription = ''
    
    try {
      if (wishlistItem.placeId) {
        const placeDetails = await getPlaceDetails(wishlistItem.placeId, { usePreferred: true })
        if (placeDetails?.editorialSummary?.text) {
          enhancedDescription = placeDetails.editorialSummary.text
        }
      }
    } catch (error) {
      console.error('Error fetching place details for description:', error)
      // Leave description empty on error
    }

    // Create the activity
    const activity = await prisma.activity.create({
      data: {
        title: wishlistItem.placeName,
        description: enhancedDescription,
        location: wishlistItem.placeVicinity || wishlistItem.placeName,
        locationPlaceId: wishlistItem.placeId,
        locationLat: wishlistItem.locationLat,
        locationLng: wishlistItem.locationLng,
        placePhotoReference: wishlistItem.placePhotoReference,
        startTime: targetStartTime,
        duration: targetDuration,
        dayId: targetDay.id,
        dayIndex: targetDayIndex,
        createdBy: session.user.id,
        isGroupActivity: true
      }
    })

    // Remove from wishlist (optional - user might want to keep it)
    // await prisma.wishlistItem.delete({
    //   where: { id: wishlistItemId }
    // })

    return NextResponse.json({ 
      success: true, 
      activity,
      timeSlot: {
        dayIndex: targetDayIndex,
        startTime: targetStartTime,
        endTime: (() => {
          const [hours, minutes] = targetStartTime.split(':').map(Number)
          const totalMinutes = hours * 60 + minutes + targetDuration
          const endHours = Math.floor(totalMinutes / 60)
          const endMins = totalMinutes % 60
          return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
        })()
      }
    })

  } catch (error) {
    console.error('Error adding wishlist item to itinerary:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}