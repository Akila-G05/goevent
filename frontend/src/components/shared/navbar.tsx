import React from 'react';
import { Calendar, Ticket, User, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2">
              <div className="p-2 bg-indigo-600 rounded-lg text-white">
                <Ticket className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-gray-900 tracking-tight">GoEvent</span>
            </Link>
          </div>

          <nav className="flex items-center space-x-6">
            <Link
              to="/"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors flex items-center space-x-1"
            >
              <Calendar className="w-4 h-4" />
              <span>Explore Events</span>
            </Link>
            <Link
              to="/creator"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors flex items-center space-x-1"
            >
              <Ticket className="w-4 h-4" />
              <span>Host Event</span>
            </Link>
            <Link
              to="/admin"
              className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors flex items-center space-x-1"
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </Link>
            <div className="border-l border-gray-200 h-6 mx-2" />
            <Link
              to="/login"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};
