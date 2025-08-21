import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiUsageTracker } from '@/lib/api-usage-tracker'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin access (you might want to add admin role checking here)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') || 'google-maps'
    const days = parseInt(searchParams.get('days') || '7')
    const action = searchParams.get('action')

    // Handle specific actions
    if (action === 'cleanup') {
      const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30')
      const deletedCount = await apiUsageTracker.cleanupOldRecords(olderThanDays)
      return NextResponse.json({ 
        message: `Cleaned up ${deletedCount} old records`,
        deletedCount 
      })
    }

    // Get usage statistics
    const stats = await apiUsageTracker.getUsageStats(service, days)
    
    // Group by date for easier consumption
    const dailyStats = stats.dailyUsage.reduce((acc, record) => {
      if (!acc[record.date]) {
        acc[record.date] = {
          date: record.date,
          endpoints: {},
          totalCalls: 0
        }
      }
      acc[record.date].endpoints[record.endpoint] = record.count
      acc[record.date].totalCalls += record.count
      return acc
    }, {} as Record<string, any>)

    const todayString = new Date().toISOString().split('T')[0]
    const todayUsage = dailyStats[todayString]?.totalCalls || 0
    const remainingCalls = Math.max(0, stats.config.dailyLimit - todayUsage)

    return NextResponse.json({
      service,
      period: `${days} days`,
      config: stats.config,
      today: {
        date: todayString,
        usage: todayUsage,
        remaining: remainingCalls,
        percentUsed: Math.round((todayUsage / stats.config.dailyLimit) * 100)
      },
      totalUsage: stats.totalUsage,
      dailyBreakdown: Object.values(dailyStats).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    })
  } catch (error) {
    console.error('Error fetching API usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API usage statistics' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin access
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { service, dailyLimit, enabled } = body

    if (!service) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

    const updates: { dailyLimit?: number; enabled?: boolean } = {}
    if (typeof dailyLimit === 'number' && dailyLimit >= 0) {
      updates.dailyLimit = dailyLimit
    }
    if (typeof enabled === 'boolean') {
      updates.enabled = enabled
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    await apiUsageTracker.updateConfig(service, updates)

    return NextResponse.json({ 
      message: 'API configuration updated successfully',
      service,
      updates
    })
  } catch (error) {
    console.error('Error updating API configuration:', error)
    return NextResponse.json(
      { error: 'Failed to update API configuration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow admin access
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const date = searchParams.get('date')

    if (!service) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      )
    }

    await apiUsageTracker.resetDailyUsage(service, date || undefined)

    return NextResponse.json({ 
      message: `Daily usage reset for ${service}${date ? ` on ${date}` : ' today'}`,
      service,
      date: date || new Date().toISOString().split('T')[0]
    })
  } catch (error) {
    console.error('Error resetting API usage:', error)
    return NextResponse.json(
      { error: 'Failed to reset API usage' },
      { status: 500 }
    )
  }
}