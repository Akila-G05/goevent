import React from 'react';
import { Calendar, MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <div className="text-center py-12 px-6 bg-gradient-to-r from-indigo-700 to-purple-800 rounded-2xl text-white shadow-xl mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          Discover & Book Unforgettable Experiences
        </h1>
        <p className="text-lg sm:text-xl text-indigo-100 max-w-2xl mx-auto mb-8">
          Seamless ticket reservations with real-time inventory and instant, verified QR check-ins.
        </p>

        {/* Search bar */}
        <div className="max-w-xl mx-auto flex items-center bg-white rounded-lg p-2 shadow-lg text-gray-900">
          <Search className="w-5 h-5 text-gray-400 ml-2" />
          <input
            type="text"
            placeholder="Search events, venues, or categories..."
            className="w-full px-3 py-2 text-sm focus:outline-none text-gray-900"
            aria-label="Search events"
          />
          <Button size="md" variant="primary">
            Search
          </Button>
        </div>
      </div>

      {/* Featured / Upcoming Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Events</h2>
          <span className="text-sm font-medium text-indigo-600 cursor-pointer hover:underline">
            View all
          </span>
        </div>

        {/* Sample Event Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
              <span className="text-2xl font-bold">Tech Summit 2026</span>
            </div>
            <div className="p-6">
              <div className="flex items-center text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                Conference
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Global Developer Conference
              </h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                Join industry leaders and senior architects discussing the future of modular monoliths, distributed scale, and modern web architectures.
              </p>
              <div className="space-y-2 mb-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span>November 15, 2026 • 09:00 AM UTC</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  <span>Grand Convention Center, San Francisco</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div>
                  <span className="text-xs text-gray-500">Starting from</span>
                  <div className="text-lg font-bold text-gray-900">$149.00</div>
                </div>
                <Button size="sm" variant="primary">
                  Book Tickets
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
