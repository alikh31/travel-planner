'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Clock, Home } from 'lucide-react'
import LocationSearch from '@/components/LocationSearch'

interface UserSettings {
  homeCity: string
  homeCityPlaceId: string
  homeCityLat: number | null
  homeCityLng: number | null
  preferredStartTime: string
  preferredEndTime: string
}

const DEFAULT_SETTINGS: UserSettings = {
  homeCity: '',
  homeCityPlaceId: '',
  homeCityLat: null,
  homeCityLng: null,
  preferredStartTime: '09:00',
  preferredEndTime: '21:00',
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Load settings from localStorage
  useEffect(() => {
    if (session?.user?.id) {
      const savedSettings = localStorage.getItem(`settings-${session.user.id}`)
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
        } catch (error) {
          console.error('Error parsing saved settings:', error)
        }
      }
      setIsLoading(false)
    }
  }, [session?.user?.id])

  const handleSaveSettings = async () => {
    if (!session?.user?.id) return

    setIsSaving(true)
    try {
      // Save to localStorage
      localStorage.setItem(`settings-${session.user.id}`, JSON.stringify(settings))
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage('Error saving settings. Please try again.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const handleHomeCityChange = async (location: string, placeData: any) => {
    setSettings(prev => ({
      ...prev,
      homeCity: location,
      homeCityPlaceId: placeData?.place_id || '',
      homeCityLat: placeData?.geometry?.location?.lat || null,
      homeCityLng: placeData?.geometry?.location?.lng || null,
    }))
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-cloud-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-cloud-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b overflow-visible">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Link 
              href="/" 
              className="text-stone-gray-600 hover:text-stone-gray-900 mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-stone-gray-900">Settings</h1>
              <p className="text-sm text-stone-gray-600">Customize your travel preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-stone-gray-200">
          <div className="px-6 py-4 border-b border-stone-gray-200">
            <h2 className="text-lg font-semibold text-stone-gray-900">Travel Preferences</h2>
            <p className="text-sm text-stone-gray-600 mt-1">
              Set your default preferences for trip planning
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Home City */}
            <div>
              <label className="flex items-center text-sm font-medium text-stone-gray-700 mb-2">
                <Home className="h-4 w-4 mr-2 text-stone-gray-500" />
                Home City
              </label>
              <LocationSearch
                value={settings.homeCity}
                onChange={handleHomeCityChange}
                placeholder="Search for your home city..."
                className="w-full"
              />
              <p className="text-xs text-stone-gray-500 mt-1">
                This helps with calculating travel times and suggesting nearby destinations
              </p>
            </div>

            {/* Preferred Start Time */}
            <div>
              <label className="flex items-center text-sm font-medium text-stone-gray-700 mb-2">
                <Clock className="h-4 w-4 mr-2 text-stone-gray-500" />
                Preferred Start of Day
              </label>
              <input
                type="time"
                value={settings.preferredStartTime}
                onChange={(e) => setSettings(prev => ({ ...prev, preferredStartTime: e.target.value }))}
                className="w-full md:w-auto border border-stone-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500 focus:border-ocean-blue-500"
              />
              <p className="text-xs text-stone-gray-500 mt-1">
                Default time when your daily activities should begin
              </p>
            </div>

            {/* Preferred Back to Accommodation Time */}
            <div>
              <label className="flex items-center text-sm font-medium text-stone-gray-700 mb-2">
                <MapPin className="h-4 w-4 mr-2 text-stone-gray-500" />
                Preferred Return to Accommodation
              </label>
              <input
                type="time"
                value={settings.preferredEndTime}
                onChange={(e) => setSettings(prev => ({ ...prev, preferredEndTime: e.target.value }))}
                className="w-full md:w-auto border border-stone-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-blue-500 focus:border-ocean-blue-500"
              />
              <p className="text-xs text-stone-gray-500 mt-1">
                Default time when you prefer to return to your accommodation
              </p>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                saveMessage.includes('Error') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-stone-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="flex items-center px-6 py-2 bg-ocean-blue-600 hover:bg-ocean-blue-700 disabled:bg-ocean-blue-400 text-white rounded-lg transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}