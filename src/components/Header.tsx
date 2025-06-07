import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mic } from 'lucide-react';

function Header() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">VoiceForm Pro</span>
          </Link>
          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/features" 
              className={`transition-colors ${isActive('/features') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              Features
            </Link>
            <Link 
              to="/industries" 
              className={`transition-colors ${isActive('/industries') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              Industries
            </Link>
            <Link 
              to="/security" 
              className={`transition-colors ${isActive('/security') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              Security
            </Link>
            <Link 
              to="/pricing" 
              className={`transition-colors ${isActive('/pricing') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              Pricing
            </Link>
            <Link 
              to="/about" 
              className={`transition-colors ${isActive('/about') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className={`transition-colors ${isActive('/contact') ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link 
              to="/login"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              to="/login"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;