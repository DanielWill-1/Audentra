import { Link } from 'react-router-dom';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border mt-section-desktop">
      <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-space-xl pb-space-lg">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-space-sm">
              <span className="flex items-center gap-[2px] h-3.5" aria-hidden="true">
                <span className="w-[2px] h-2 bg-primary rounded-full" />
                <span className="w-[2px] h-3 bg-voice rounded-full" />
                <span className="w-[2px] h-3.5 bg-primary rounded-full" />
                <span className="w-[2px] h-2 bg-voice rounded-full" />
                <span className="w-[2px] h-1 bg-primary rounded-full" />
              </span>
              <span className="font-headline-h3 text-headline-h3 text-text-primary tracking-tight">Audentra</span>
            </div>
            <p className="font-body text-body text-text-secondary max-w-xs leading-relaxed">
              Open-source voice-to-structured-data automation.
            </p>
          </div>

          {/* Columns */}
          <div className="flex gap-16 md:gap-20">
            <div>
              <h4 className="font-metadata text-metadata uppercase tracking-wider text-text-muted mb-space-md font-semibold">
                Project
              </h4>
              <ul className="space-y-space-sm font-body text-body text-text-secondary">
                <li><Link to="/features" className="hover:text-text-primary transition-colors">Features</Link></li>
                <li><Link to="/dashboard" className="hover:text-text-primary transition-colors">Hosted Demo</Link></li>
                <li><a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">GitHub Repo</a></li>
                <li><Link to="/documentation" className="hover:text-text-primary transition-colors">Documentation</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-metadata text-metadata uppercase tracking-wider text-text-muted mb-space-md font-semibold">
                Legal
              </h4>
              <ul className="space-y-space-sm font-body text-body text-text-secondary">
                <li><Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy Notice</Link></li>
                <li><Link to="/terms" className="hover:text-text-primary transition-colors">Terms of Use</Link></li>
                <li><Link to="/open" className="hover:text-text-primary transition-colors">Open Source License</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-space-xl pt-space-lg">
          <p className="font-metadata text-metadata text-text-muted">
            © 2025 Audentra. Open source project contributors.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;