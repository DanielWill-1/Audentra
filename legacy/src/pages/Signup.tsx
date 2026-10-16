import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2, Check } from 'lucide-react';
import { signUpWithEmail, signInWithOAuth } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

function Signup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    industry: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy');
      return false;
    }

    return true;
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await signUpWithEmail(
        formData.email,
        formData.password,
        {
          first_name: formData.firstName,
          last_name: formData.lastName,
          company: formData.company,
          industry: formData.industry
        }
      );

      if (error) {
        setError(error.message);
      } else {
        setSuccess('Account created successfully! Please check your email to verify your account.');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: 'google' | 'microsoft') => {
    setOauthLoading(provider);
    setError(null);

    try {
      const { error } = await signInWithOAuth(provider);

      if (error) {
        setError(`${provider} authentication failed: ${error.message}`);
        setOauthLoading(null);
      }
      // Success is handled by the auth state change or redirect
    } catch (err) {
      setError(`${provider} authentication failed. Please try again.`);
      setOauthLoading(null);
    }
  };

  const passwordStrength = () => {
    const password = formData.password;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-error';
    if (strength < 4) return 'bg-warning';
    return 'bg-success';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  const inputClass =
    'block w-full h-10 px-3 border border-border rounded-lg bg-surface text-text-primary placeholder-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-margin">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8 group">
          <span className="flex items-center gap-[2px] h-4 py-0.5" aria-hidden="true">
            <span className="w-[2.5px] h-2 bg-primary group-hover:h-3.5 transition-all duration-150 rounded-full" />
            <span className="w-[2.5px] h-3.5 bg-voice group-hover:h-2 transition-all duration-150 rounded-full" />
            <span className="w-[2.5px] h-4 bg-primary group-hover:h-[18px] transition-all duration-150 rounded-full" />
            <span className="w-[2.5px] h-2.5 bg-voice group-hover:h-3 transition-all duration-150 rounded-full" />
            <span className="w-[2.5px] h-1.5 bg-primary group-hover:h-2 transition-all duration-150 rounded-full" />
          </span>
          <span className="font-headline-h3 text-headline-h3 tracking-tight text-text-primary">Audentra</span>
        </Link>

        <h1 className="font-headline-h2 text-[32px] text-text-primary font-semibold tracking-tight text-center mb-2">
          Create your account
        </h1>
        <p className="font-body text-body text-text-secondary text-center mb-8">
          Use the hosted Audentra demo.
        </p>

        {/* Error / Success */}
        {error && (
          <div className="mb-6 rounded-lg border border-error/30 bg-error/10 px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-error mt-0.5 shrink-0" aria-hidden="true" />
            <span className="font-body text-body text-error text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
            <span className="font-body text-body text-success text-sm">{success}</span>
          </div>
        )}

        {/* Card */}
        <div className="bg-surface rounded-xl border border-border p-6">
          {/* OAuth */}
          <button
            onClick={() => handleOAuthSignup('google')}
            disabled={!!oauthLoading}
            className="w-full flex items-center justify-center h-10 px-4 rounded-lg border border-border bg-surface text-text-primary hover:bg-surface-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {oauthLoading === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
                />
              </svg>
            )}
            <span className="font-body-medium text-body-medium">Continue with Google</span>
          </button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-surface font-label-code text-label-code text-text-muted">
                or create account with email
              </span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="block font-body-medium text-body-medium text-text-primary mb-1.5">
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="John"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block font-body-medium text-body-medium text-text-primary mb-1.5">
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block font-body-medium text-body-medium text-text-primary mb-1.5">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-body-medium text-body-medium text-text-primary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`${inputClass} pr-10`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>

              {formData.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-surface-subtle rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${getStrengthColor(passwordStrength())}`}
                      style={{ width: `${(passwordStrength() / 5) * 100}%` }}
                    />
                  </div>
                  <span className="font-label-code text-label-code text-text-muted">{getStrengthText(passwordStrength())}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block font-body-medium text-body-medium text-text-primary mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`${inputClass} pr-10`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                </button>
              </div>

              {formData.confirmPassword && (
                <div className="mt-2 flex items-center">
                  {formData.password === formData.confirmPassword ? (
                    <div className="flex items-center text-success">
                      <Check className="w-4 h-4 mr-1" aria-hidden="true" />
                      <span className="font-label-code text-label-code">Passwords match</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-error">
                      <AlertCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                      <span className="font-label-code text-label-code">Passwords don’t match</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                id="acceptedTerms"
                name="acceptedTerms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5"
              />
              <span className="font-body text-body text-text-secondary text-sm">
                I agree to the{' '}
                <Link to="/terms" className="text-primary hover:text-brand-hover transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary hover:text-brand-hover transition-colors">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center h-10 px-4 rounded-lg bg-[#2563eb] hover:bg-brand-hover text-white font-body-medium text-body-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="font-body text-body text-text-secondary text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary hover:text-brand-hover font-medium transition-colors">
            Sign in
          </Link>
        </p>

        <div className="mt-8 text-center">
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-metadata text-metadata text-text-muted hover:text-text-primary transition-colors"
          >
            View source on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}

export default Signup;