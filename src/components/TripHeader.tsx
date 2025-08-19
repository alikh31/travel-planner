'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, ChevronRight } from 'lucide-react'
import UserMenu from './UserMenu'

interface User {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

interface Member {
  id: string
  role: string
  user: User
}

interface Session {
  user: User
}

interface Itinerary {
  id: string
  title: string
  destination?: string
  description?: string
  startDate: string
  endDate: string
  accommodation?: string
  accommodationAddress?: string
  createdBy: string
  members: Member[]
}

interface TripHeaderProps {
  itinerary: Itinerary | null
  session: Session | null
  isAdmin: boolean
  isRefreshing?: boolean
  currentPage?: string
  backUrl?: string
}

export default function TripHeader({
  itinerary,
  isRefreshing = false,
  currentPage,
  backUrl = "/"
}: TripHeaderProps) {
  if (!itinerary) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm overflow-visible">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              href={backUrl}
              className="text-stone-gray-600 hover:text-stone-gray-900 mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-stone-gray-900">{itinerary.title}</h1>
                <div className="ml-2 flex items-center text-xs text-forest-green-600 bg-forest-green-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-forest-green-600 rounded-full mr-1 animate-pulse"></div>
                  Live
                </div>
              </div>
              <div className="flex items-center text-sm text-stone-gray-600">
                <span>{itinerary.destination}</span>
                {currentPage && (
                  <>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <Link 
                      href={`/itinerary/${itinerary.id}`}
                      className="text-ocean-blue-600 hover:text-ocean-blue-700 transition-colors"
                    >
                      Overview
                    </Link>
                    <ChevronRight className="h-4 w-4 mx-1" />
                    <span className="text-stone-gray-900 font-medium">{currentPage}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isRefreshing && (
              <div className="flex items-center text-xs text-stone-gray-500">
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Syncing...
              </div>
            )}
            
            <UserMenu itineraryId={itinerary.id} />
          </div>
        </div>


      </div>
    </header>
  )
}