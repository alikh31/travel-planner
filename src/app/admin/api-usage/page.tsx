'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface ApiUsageStats {
  service: string
  period: string
  config: {
    dailyLimit: number
    enabled: boolean
  }
  today: {
    date: string
    usage: number
    remaining: number
    percentUsed: number
  }
  totalUsage: number
  dailyBreakdown: Array<{
    date: string
    endpoints: Record<string, number>
    totalCalls: number
  }>
}

export default function ApiUsagePage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<ApiUsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [service, setService] = useState('google-maps')
  const [days, setDays] = useState(7)
  const [config, setConfig] = useState({ dailyLimit: 2000, enabled: true })
  const [updating, setUpdating] = useState(false)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/api-usage?service=${service}&days=${days}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Error fetching API stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateConfig = async () => {
    try {
      setUpdating(true)
      const response = await fetch('/api/admin/api-usage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          service,
          dailyLimit: config.dailyLimit,
          enabled: config.enabled
        })
      })

      if (response.ok) {
        await fetchStats()
      }
    } catch (error) {
      console.error('Error updating config:', error)
    } finally {
      setUpdating(false)
    }
  }

  const resetUsage = async () => {
    if (!confirm('Are you sure you want to reset today&apos;s usage count?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/api-usage?service=${service}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchStats()
      }
    } catch (error) {
      console.error('Error resetting usage:', error)
    }
  }

  useEffect(() => {
    if (session) {
      fetchStats()
    }
  }, [session, service, days])

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">API Usage Monitor</h1>
            </div>
            
            <button
              onClick={fetchStats}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Configuration</h2>
            <div className="flex items-center space-x-4">
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="google-maps">Google Maps</option>
              </select>
              
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Limit
              </label>
              <input
                type="number"
                value={config.dailyLimit}
                onChange={(e) => setConfig(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Status
              </label>
              <select
                value={config.enabled ? 'enabled' : 'disabled'}
                onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.value === 'enabled' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={updateConfig}
                disabled={updating}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Config'}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading statistics...</div>
        ) : stats ? (
          <>
            {/* Today's Usage */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Today&apos;s Usage</h2>
                <button
                  onClick={resetUsage}
                  className="inline-flex items-center px-3 py-2 text-red-600 hover:text-red-700 text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reset Today
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.today.usage}</div>
                  <div className="text-sm text-gray-500">Used Today</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.today.remaining}</div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{stats.config.dailyLimit}</div>
                  <div className="text-sm text-gray-500">Daily Limit</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.today.percentUsed}%</div>
                  <div className="text-sm text-gray-500">Usage Percentage</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      stats.today.percentUsed > 90 
                        ? 'bg-red-600' 
                        : stats.today.percentUsed > 70 
                          ? 'bg-yellow-600' 
                          : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(stats.today.percentUsed, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Daily Breakdown ({stats.period})</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Total Calls</th>
                      <th className="text-right py-2">Text Search</th>
                      <th className="text-right py-2">Nearby Search</th>
                      <th className="text-right py-2">Place Details</th>
                      <th className="text-right py-2">Photos</th>
                      <th className="text-right py-2">Location Search</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.dailyBreakdown.map((day) => (
                      <tr key={day.date} className="border-b">
                        <td className="py-2 font-medium">{day.date}</td>
                        <td className="text-right py-2">{day.totalCalls}</td>
                        <td className="text-right py-2">{day.endpoints['places-text-search'] || 0}</td>
                        <td className="text-right py-2">{day.endpoints['places-nearby-search'] || 0}</td>
                        <td className="text-right py-2">{day.endpoints['places-details'] || 0}</td>
                        <td className="text-right py-2">{day.endpoints['places-photo'] || 0}</td>
                        <td className="text-right py-2">{day.endpoints['location-search'] || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stats.dailyBreakdown.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No API usage recorded for this period
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-red-500">
            Failed to load API usage statistics
          </div>
        )}
      </main>
    </div>
  )
}