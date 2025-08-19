'use client'

import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { signOut, useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  User, 
  Users, 
  Hotel, 
  Calendar,
  LogOut,
  ChevronDown,
  Settings,
  Compass,
  Heart
} from 'lucide-react'
import Link from 'next/link'

interface UserMenuProps {
  itineraryId?: string
}

export default function UserMenu({ itineraryId }: UserMenuProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  
  if (!session?.user) return null

  // Determine if we're in an itinerary context
  const isItineraryPage = pathname?.includes('/itinerary/')
  const currentItineraryId = itineraryId || pathname?.split('/itinerary/')[1]?.split('/')[0]

  return (
    <Menu as="div" className="relative">
      <Menu.Button className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="h-8 w-8 rounded-full border border-gray-200"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {session.user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="hidden md:block text-sm font-medium text-gray-700">
          {session.user.name}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-white shadow-lg focus:outline-none z-[60]">
          {/* User Info Section */}
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-stone-gray-900">{session.user.name}</p>
            <p className="text-xs text-stone-gray-500 truncate">{session.user.email}</p>
          </div>

          {/* Itinerary Navigation - Only show when in itinerary context */}
          {isItineraryPage && currentItineraryId && (
            <div className="py-1">
              <Menu.Item>
                {({ active }) => {
                  const isCurrentPage = pathname === `/itinerary/${currentItineraryId}`
                  return (
                    <Link
                      href={`/itinerary/${currentItineraryId}`}
                      className={`${
                        active ? 'bg-stone-gray-100' : ''
                      } ${
                        isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                      } flex items-center px-4 py-2 text-sm`}
                    >
                      <Calendar className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                      Itinerary Overview
                    </Link>
                  )
                }}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => {
                  const isCurrentPage = pathname === `/itinerary/${currentItineraryId}/members`
                  return (
                    <Link
                      href={`/itinerary/${currentItineraryId}/members`}
                      className={`${
                        active ? 'bg-stone-gray-100' : ''
                      } ${
                        isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                      } flex items-center px-4 py-2 text-sm`}
                    >
                      <Users className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                      Manage Members
                    </Link>
                  )
                }}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => {
                  const isCurrentPage = pathname === `/itinerary/${currentItineraryId}/accommodation`
                  return (
                    <Link
                      href={`/itinerary/${currentItineraryId}/accommodation`}
                      className={`${
                        active ? 'bg-stone-gray-100' : ''
                      } ${
                        isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                      } flex items-center px-4 py-2 text-sm`}
                    >
                      <Hotel className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                      Accommodation
                    </Link>
                  )
                }}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => {
                  const isCurrentPage = pathname === `/itinerary/${currentItineraryId}/explore`
                  return (
                    <Link
                      href={`/itinerary/${currentItineraryId}/explore`}
                      className={`${
                        active ? 'bg-stone-gray-100' : ''
                      } ${
                        isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                      } flex items-center px-4 py-2 text-sm`}
                    >
                      <Compass className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                      Explore
                    </Link>
                  )
                }}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => {
                  const isCurrentPage = pathname === `/itinerary/${currentItineraryId}/wishlist`
                  return (
                    <Link
                      href={`/itinerary/${currentItineraryId}/wishlist`}
                      className={`${
                        active ? 'bg-stone-gray-100' : ''
                      } ${
                        isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                      } flex items-center px-4 py-2 text-sm`}
                    >
                      <Heart className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                      Wishlist
                    </Link>
                  )
                }}
              </Menu.Item>
            </div>
          )}

          {/* User Actions */}
          <div className="py-1">
            <Menu.Item>
              {({ active }) => {
                const isCurrentPage = pathname === '/'
                return (
                  <button
                    onClick={() => router.push('/')}
                    className={`${
                      active ? 'bg-stone-gray-100' : ''
                    } ${
                      isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                    } flex w-full items-center px-4 py-2 text-sm`}
                  >
                    <User className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                    My Itineraries
                  </button>
                )
              }}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => {
                const isCurrentPage = pathname === '/settings'
                return (
                  <Link
                    href="/settings"
                    className={`${
                      active ? 'bg-stone-gray-100' : ''
                    } ${
                      isCurrentPage ? 'bg-ocean-blue-50 text-ocean-blue-700' : 'text-stone-gray-700'
                    } flex items-center px-4 py-2 text-sm`}
                  >
                    <Settings className={`mr-3 h-4 w-4 ${isCurrentPage ? 'text-ocean-blue-500' : 'text-stone-gray-400'}`} />
                    Settings
                  </Link>
                )
              }}
            </Menu.Item>
          </div>

          {/* Sign Out */}
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className={`${
                    active ? 'bg-stone-gray-100' : ''
                  } flex w-full items-center px-4 py-2 text-sm text-sunset-coral-600`}
                >
                  <LogOut className="mr-3 h-4 w-4 text-sunset-coral-500" />
                  Sign Out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}