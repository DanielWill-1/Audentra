import { Link } from 'react-router-dom';
import {
  Mic,
  Check,
  AudioWaveform,
  Brain,
  FileText,
  Network,
  ShieldCheck,
  ArrowUpRight,
  X,
} from 'lucide-react';

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

function Features() {
  return (
    <div className="bg-background">
      {/* PAGE INTRO */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-24">
        <div className="max-w-2xl">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-4">
            Product Capabilities
          </span>
          <h1 className="font-display-hero text-[48px] md:text-display-hero leading-[1.08] text-text-primary tracking-tight font-bold mb-6">
            Voice in.
            <br />
            Structured data out.
          </h1>
          <p className="font-body-large text-body-large text-text-secondary max-w-xl leading-relaxed mb-8">
            Audentra turns natural conversation into structured information ready for real workflows.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-white px-6 py-3 rounded-lg transition-colors duration-150"
            >
              Try Demo
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body-medium text-body-medium bg-surface hover:bg-surface-subtle text-text-primary border border-border-strong px-5 py-3 rounded-lg transition-colors duration-150"
            >
              <GitHubIcon />
              <span>View Source</span>
            </a>
          </div>
        </div>
      </section>

      {/* VOICE INPUT */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pb-16 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">01 · Voice Input</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Speak naturally.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
              Describe information in your own words instead of filling fields one at a time. Audentra listens for
              meaning, not rigid dictation commands.
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="bg-surface-subtle border-b border-border px-5 py-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-voice-soft text-voice font-label-code text-label-code font-medium">
                  <span className="w-2 h-2 rounded-full bg-voice animate-ping" />
                  Listening
                </span>
                <span className="font-label-code text-label-code text-text-muted">00:08.4 s</span>
              </div>
              <div className="p-5 md:p-6 flex flex-col gap-4">
                <div className="bg-surface-subtle p-3.5 rounded-lg border border-border">
                  <p className="font-body text-[14px] leading-relaxed text-text-secondary italic">
                    “Hi, I’m Sarah Kim, born June 2nd 1991. I’m here about back pain that started two days ago after
                    lifting boxes at work.”
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Microphone"
                      className="w-9 h-9 rounded-full bg-voice flex items-center justify-center text-on-primary hover:opacity-90 transition-opacity"
                    >
                      <Mic className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <div className="flex flex-col">
                      <span className="font-metadata text-metadata font-medium text-text-primary">Acoustic Parser Active</span>
                      <span className="font-label-code text-[11px] text-text-muted">48kHz • low latency</span>
                    </div>
                  </div>
                  <span className="flex items-center gap-[3px] h-5" aria-hidden="true">
                    <span className="w-[3px] h-3 bg-voice/40 rounded-full" />
                    <span className="w-[3px] h-5 bg-voice rounded-full" />
                    <span className="w-[3px] h-2 bg-voice/60 rounded-full" />
                    <span className="w-[3px] h-4 bg-voice rounded-full" />
                    <span className="w-[3px] h-6 bg-voice rounded-full" />
                    <span className="w-[3px] h-3 bg-voice/80 rounded-full" />
                    <span className="w-[3px] h-5 bg-voice rounded-full" />
                    <span className="w-[3px] h-2 bg-voice/30 rounded-full" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTEXTUAL UNDERSTANDING */}
      <section className="w-full bg-surface border-y border-border py-16 md:py-28">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">02 · Contextual Understanding</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              More than transcription.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Where a plain transcript stops at words, Audentra identifies entities, timing, triggers, and negative
              findings — then assembles them into structured meaning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 items-stretch">
                      <div className="bg-surface-subtle rounded-xl border border-border p-6">
                        <div className="font-label-code text-label-code text-text-muted mb-3">Spoken sentence</div>
                        <p className="font-body text-body text-text-primary leading-relaxed">
                          “I’ve had pain in my lower back for two days after lifting boxes.”
                        </p>
                      </div>
                      <div className="flex items-center justify-center text-text-muted" aria-hidden="true">
                        <span className="hidden md:block text-2xl">↓</span>
                        <span className="md:hidden -my-2">↓</span>
                      </div>
                      <div className="bg-surface-subtle rounded-xl border border-border p-6">
                        <div className="font-label-code text-label-code text-text-muted mb-3">Identified context & entities</div>
                        <ul className="space-y-2 font-body text-body text-text-primary">
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded bg-primary" /> Location: lower back
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded bg-voice" /> Onset: 2 days ago
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded bg-warning" /> Trigger: heavy lifting
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded bg-error" /> Negative: no radiation
                          </li>
                        </ul>
                      </div>
                      <div className="flex items-center justify-center text-text-muted" aria-hidden="true">
                        <span className="hidden md:block text-2xl">↓</span>
                        <span className="md:hidden -my-2">↓</span>
                      </div>
                      <div className="bg-surface-subtle rounded-xl border border-border p-6">
                        <div className="font-label-code text-label-code text-text-muted mb-3">Structured meaning</div>
                        <p className="font-body text-body text-text-primary leading-relaxed">
                          A lower-back complaint with a two-day onset, triggered by heavy lifting, no radiation — ready to map to
                          schema fields.
                        </p>
                      </div>
                    </div>
        </div>
      </section>

      {/* STRUCTURED EXTRACTION */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">03 · Structured Extraction</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Conversation into fields.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
              Every relevant detail is mapped directly into the target schema, with confidence shown on each field.
            </p>
            <p className="font-body text-body text-text-secondary mt-4 leading-relaxed">
              “John Smith, born March 15th 1985. Shoulder pain for about one week after tennis.”
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="bg-surface rounded-xl border border-border p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-metadata text-metadata uppercase tracking-wider text-text-muted font-semibold">
                  Patient Intake
                </span>
                <span className="font-metadata text-metadata text-success flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Mapped
                </span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-metadata text-metadata text-text-secondary">Full Name</label>
                    <div className="flex items-center justify-between h-10 px-3 bg-surface-subtle border border-border rounded-lg">
                      <span className="font-body-medium text-body text-text-primary">John Smith</span>
                      <span className="px-2 py-0.5 rounded bg-success/10 text-success font-label-code text-label-code font-medium">99.8% ✓</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-metadata text-metadata text-text-secondary">Date of Birth</label>
                    <div className="flex items-center justify-between h-10 px-3 bg-surface-subtle border border-border rounded-lg">
                      <span className="font-body-medium text-body text-text-primary">15 Mar 1985</span>
                      <span className="px-2 py-0.5 rounded bg-success/10 text-success font-label-code text-label-code font-medium">Verified ✓</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="font-metadata text-metadata text-text-secondary">Chief Complaint</label>
                  <div className="flex items-center justify-between h-10 px-3 bg-surface-subtle border border-border rounded-lg">
                    <span className="font-body-medium text-body text-text-primary">Shoulder pain</span>
                    <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">Extracted</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-metadata text-metadata text-text-secondary">Duration</label>
                    <div className="flex items-center justify-between h-10 px-3 bg-surface-subtle border border-border rounded-lg">
                      <span className="font-body-medium text-body text-text-primary">1 week</span>
                      <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">Extracted</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-metadata text-metadata text-text-secondary">Context</label>
                    <div className="flex items-center justify-between h-10 px-3 bg-surface-subtle border border-border rounded-lg">
                      <span className="font-body-medium text-body text-text-primary truncate">Sports-related</span>
                      <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">Extracted</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DYNAMIC FORMS */}
      <section className="w-full bg-surface-subtle/50 border-y border-border py-16 md:py-28">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">04 · Dynamic Forms</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Any schema, same interface.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Different schemas define different structured outputs. The voice interaction stays the same.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface rounded-xl border border-border p-6">
              <FileText className="w-6 h-6 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Patient Intake</h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Demographics, chief complaint, duration, and clinical context.
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <ShieldCheck className="w-6 h-6 text-warning mb-4" aria-hidden="true" />
              <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Safety Inspection</h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Site audits, checklists, equipment readings, and flag conditions.
              </p>
            </div>
            <div className="bg-surface rounded-xl border border-border p-6">
              <Network className="w-6 h-6 text-voice mb-4" aria-hidden="true" />
              <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Employee Onboarding</h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Personal details, role information, and onboarding records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEW & VALIDATION */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">05 · Review & Validation</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              You stay in control.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
              Review every extracted field before submission. Correct, edit, or re-record anything — nothing is
              committed until you sign off.
            </p>
          </div>
          <div className="lg:col-span-7">
            <div className="bg-surface rounded-xl border border-border p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="font-metadata text-metadata uppercase tracking-wider text-text-muted font-semibold">
                  Review before submit
                </span>
                <span className="font-label-code text-label-code text-text-muted">2 fields need attention</span>
              </div>
              <div className="space-y-2 font-body text-body">
                <div className="flex items-center justify-between py-2 border-b border-border/70">
                  <span className="font-metadata text-metadata text-text-muted">Full Name</span>
                  <span className="font-body-medium text-text-primary font-medium flex items-center gap-1.5">
                    John Smith <Check className="w-4 h-4 text-success" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/70">
                  <span className="font-metadata text-metadata text-text-muted">Date of Birth</span>
                  <span className="font-body-medium text-text-primary font-medium">15 Mar 1985</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/70">
                  <span className="font-metadata text-metadata text-text-muted">Chief Complaint</span>
                  <span className="font-body-medium text-text-primary font-medium flex items-center gap-1.5">
                    Shoulder pain <X className="w-4 h-4 text-error" aria-hidden="true" />
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="font-metadata text-metadata text-text-muted">Duration</span>
                  <span className="font-body-medium text-text-primary font-medium">1 week</span>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="font-label-code text-[11px] text-text-muted">Confidence: 0.987</span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-white px-5 h-10 rounded-lg transition-colors duration-150"
                >
                  Submit form
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXTENSIBILITY / OPEN SOURCE */}
      <section className="w-full bg-surface border-y border-border py-16 md:py-28">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">06 · Extensibility & Open Source</span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Inspectable and extensible.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Audentra is open source and self-hostable. Read the source, extend the pipeline, or run it on your own
              infrastructure.
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
              <span>View Source</span>
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
              Contribute
            </a>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-20 md:py-32">
        <div className="bg-surface rounded-2xl border border-border p-8 md:p-16 text-center flex flex-col items-center justify-center">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted mb-4 block">
            Get Started
          </span>
          <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-bold tracking-tight max-w-2xl mb-4">
            Try the workflow yourself.
          </h2>
          <p className="font-body-large text-body-large text-text-secondary max-w-xl mb-8">
            Speak into the hosted demo and watch conversation become structured data.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center font-body-medium text-body-medium bg-[#2563eb] hover:bg-brand-hover text-white px-7 py-3 rounded-lg transition-colors duration-150"
            >
              Try Demo
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-body-medium text-body-medium bg-surface hover:bg-surface-subtle text-text-primary border border-border-strong px-6 py-3 rounded-lg transition-colors duration-150"
            >
              <GitHubIcon />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Features;