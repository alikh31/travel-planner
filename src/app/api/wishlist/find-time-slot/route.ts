import { NextRequest, NextResponse } from 'next/server'
import { findFirstAvailableTimeSlot } from '@/lib/time-slot-finder'

export async function POST(request: NextRequest) {
  try {
    const { gptTimeframe, gptDuration, existingActivities, days } = await request.json()

    const timeSlot = findFirstAvailableTimeSlot(
      gptTimeframe,
      gptDuration,
      existingActivities,
      days
    )

    return NextResponse.json({ 
      success: true, 
      timeSlot 
    })

  } catch (error) {
    console.error('Error finding time slot:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}