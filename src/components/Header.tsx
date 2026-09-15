import { Link, useLocation } from 'react-router-dom';
import { Github, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

function Header() {
  const location = useLocation();
  const { user } = useAuth();

  const navLink = (path: string) =>
    location.pathname === path ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary';

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="h-16 max-w-[1200px] mx-auto px-margin md:px-margin-desktop flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group text-text-primary">
            <span className="flex items-center gap-[2px] h-4 py-0.5" aria-hidden="true">
              <span className="w-[2.5px] h-2 bg-primary group-hover:h-3.5 transition-all duration-150 rounded-full" />
              <span className="w-[2.5px] h-3.5 bg-voice group-hover:h-2 transition-all duration-150 rounded-full" />
              <span className="w-[2.5px] h-4 bg-primary group-hover:h-[18px] transition-all duration-150 rounded-full" />
              <span className="w-[2.5px] h-2.5 bg-voice group-hover:h-3 transition-all duration-150 rounded-full" />
              <span className="w-[2.5px] h-1.5 bg-primary group-hover:h-2 transition-all duration-150 rounded-full" />
            </span>
            <span className="font-headline-h3 text-headline-h3 tracking-tight text-text-primary">Audentra</span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-space-lg">
          <Link to="/features" className={`font-body-medium text-body-medium transition-colors ${navLink('/features')}`}>
            Features
          </Link>
          <Link to="/about" className={`font-body-medium text-body-medium transition-colors ${navLink('/about')}`}>
            About
          </Link>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body-medium text-body-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" aria-hidden="true" />
            <span>GitHub</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
          </a>
        </nav>

        <div className="flex items-center gap-space-md">
          {user ? (
            <Link
              to="/dashboard"
              className="font-body-medium text-body-medium text-text-secondary hover:text-text-primary px-space-sm py-2 transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-body-medium text-body-medium text-text-secondary hover:text-text-primary px-space-sm py-2 transition-colors"
            >
              Sign in
            </Link>
          )}
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-on-primary px-4 h-10 rounded-lg transition-colors duration-150"
          >
            Try Demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;