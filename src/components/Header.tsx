import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mic, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Redirect to home page after successful sign out
      navigate('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still redirect even if there's an error
      navigate('/');
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">Audentra</span>
            <img
              src="/image.png" // Reference the logo from the public folder
              alt="Audentra Logo"
              className="w-20 h-20 object-contain"
            />
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
            {user ? (
              <>
                <Link 
                  to="/dashboard"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  to="/signup"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;