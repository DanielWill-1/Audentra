import { Link } from 'react-router-dom';
import { Github, MessageSquare, Mail, ArrowUpRight } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

const GitHubIcon = () => (
  <svg aria-hidden="true" className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      fillRule="evenodd"
    />
  </svg>
);

function About() {
  return (
    <div className="bg-background">
      {/* PAGE INTRO */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-24">
        <div className="max-w-2xl">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-4">
            About Audentra
          </span>
          <h1 className="font-display-hero text-[48px] md:text-display-hero leading-[1.08] text-text-primary tracking-tight font-bold mb-6">
            Forms shouldn’t require
            <br />
            this much typing.
          </h1>
          <p className="font-body-large text-body-large text-text-secondary max-w-xl leading-relaxed mb-8">
            Professional workflows often require people to manually translate information they already know into rigid
            form fields. Audentra explores a simpler interaction — speak naturally, understand context, produce
            structured data.
          </p>
        </div>
      </section>

      {/* THE IDEA */}
      <section className="w-full bg-surface border-y border-border py-16 md:py-28">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">The Idea</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Speech shouldn’t just become text.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              It should become useful structured information. Audentra reduces the gap between how people talk and how
              systems expect data to arrive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 items-stretch">
            <div className="bg-surface-subtle rounded-xl border border-border p-6">
              <div className="font-label-code text-label-code text-text-muted mb-3">Voice</div>
              <p className="font-body text-body text-text-primary leading-relaxed">
                A person describes information conversationally.
              </p>
            </div>
            <div className="flex items-center justify-center text-text-muted" aria-hidden="true">
              <span className="hidden md:block text-2xl">↓</span>
              <span className="md:hidden -my-2">↓</span>
            </div>
            <div className="bg-surface-subtle rounded-xl border border-border p-6">
              <div className="font-label-code text-label-code text-text-muted mb-3">Context</div>
              <p className="font-body text-body text-text-primary leading-relaxed">
                Entities, timing, and relationships are identified.
              </p>
            </div>
            <div className="flex items-center justify-center text-text-muted" aria-hidden="true">
              <span className="hidden md:block text-2xl">↓</span>
              <span className="md:hidden -my-2">↓</span>
            </div>
            <div className="bg-surface-subtle rounded-xl border border-border p-6">
              <div className="font-label-code text-label-code text-text-muted mb-3">Structure</div>
              <p className="font-body text-body text-text-primary leading-relaxed">
                Meaning maps cleanly into schema-defined fields.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY AUDENTRA */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">Why Audentra</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Built around a real problem.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
              In healthcare, field work, HR, and operations, people repeatedly re-type information they already know
              into structured forms. That manual translation is slow, error-prone, and takes time away from the work
              that matters.
            </p>
            <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
              Audentra exists to test a different interaction: speak naturally, review the result, and let the pipeline
              handle the structure. It is a focused, inspectable project — not a black-box service.
            </p>
          </div>
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section className="w-full bg-surface border-y border-border py-16 md:py-28">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">Open Source</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Built in the open.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Audentra can be inspected, extended, and contributed to. The source is the product.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-white px-6 py-3 rounded-lg transition-colors duration-150"
            >
              <GitHubIcon />
              <span>View on GitHub</span>
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </a>
            <Link
              to="/documentation"
              className="inline-flex items-center gap-2 font-body-medium text-body-medium bg-surface hover:bg-surface-subtle text-text-primary border border-border-strong px-5 py-3 rounded-lg transition-colors duration-150"
            >
              Documentation
            </Link>
            <a
              href={`${GITHUB_REPO}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body-medium text-body-medium bg-surface hover:bg-surface-subtle text-text-primary border border-border-strong px-5 py-3 rounded-lg transition-colors duration-150"
            >
              Contributing
            </a>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="max-w-2xl mb-12">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">Contact</span>
          <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            Get in touch.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href={`${GITHUB_REPO}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 hover:border-border-strong transition-colors"
          >
            <Github className="w-6 h-6 text-primary mb-4" aria-hidden="true" />
            <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">GitHub Issues</h3>
            <p className="font-body text-body text-text-secondary">Bugs and technical problems.</p>
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface rounded-xl border border-border p-6 hover:border-border-strong transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-voice mb-4" aria-hidden="true" />
            <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Discussions</h3>
            <p className="font-body text-body text-text-secondary">Ideas and project discussion.</p>
          </a>
          <a
                      href="mailto:danielwillson004@gmail.com"
                      className="bg-surface rounded-xl border border-border p-6 hover:border-border-strong transition-colors"
                    >
                      <Mail className="w-6 h-6 text-warning mb-4" aria-hidden="true" />
                      <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Email</h3>
                      <p className="font-body text-body text-text-secondary">Direct contact for everything else.</p>
                    </a>
        </div>
      </section>
    </div>
  );
}

export default About;