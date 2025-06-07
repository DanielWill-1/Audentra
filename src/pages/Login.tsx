import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mic, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Chrome,
  Loader2
} from 'lucide-react';
import { signInWithEmail, signInWithOAuth } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Handle OAuth callback messages
  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      setError(errorDescription || 'Authentication failed');
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithEmail(email, password);
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    setOauthLoading(provider);
    setError(null);

    try {
      const { error } = await signInWithOAuth(provider);
      
      if (error) {
        setError(error.message);
        setOauthLoading(null);
      }
      // Success will be handled by the auth state change
    } catch (err) {
      setError('OAuth authentication failed');
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-3 mb-8 group">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mic className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">VoiceForm Pro</span>
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Welcome Back
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Sign in to access your voice-powered forms and continue transforming your workflow.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => handleOAuthLogin('google')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
            ) : (
              <Chrome className="w-5 h-5 mr-3" />
            )}
            <span className="font-medium">Continue with Google</span>
          </button>

          <button
            onClick={() => handleOAuthLogin('microsoft')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {oauthLoading === 'microsoft' ? (
              <Loader2 className="w-5 h-5 animate-spin mr-3" />
            ) : (
              <div className="w-5 h-5 mr-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-sm flex items-center justify-center">
                <span className="text-white text-xs font-bold">M</span>
              </div>
            )}
            <span className="font-medium">Continue with Microsoft</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-all"
                  placeholder="Enter your work email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Keep me signed in
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-5 h-5 mr-2" />
              )}
              {loading ? 'Signing in...' : 'Sign in to your workspace'}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center">
              <Shield className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">
                Your login is secured with enterprise-grade encryption and blockchain verification.
              </p>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to VoiceForm Pro?{' '}
              <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Create your account
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              HIPAA Compliant
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              SOC 2 Certified
            </div>
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
              Blockchain Verified
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;