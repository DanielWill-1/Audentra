import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  Check,
  Code2,
  Terminal,
  AudioWaveform,
  Network,
  Stethoscope,
  HardHat,
  Building2,
  Trash2,
  Lock,
  Cpu,
  ShieldCheck,
  ScrollText,
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

const WAVEFORM_BARS = [0, 1, 2, 3, 4, 5, 6, 7];

function AnimatedWaveform({ id }: { id: string }) {
  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const bars = Array.from(el.querySelectorAll('span'));
    const timer = setInterval(() => {
      bars.forEach((bar) => {
        bar.style.height = `${Math.floor(Math.random() * 20) + 6}px`;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [id]);

  return (
    <span id={id} className="flex items-center gap-[3px] h-5">
      {WAVEFORM_BARS.map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all duration-300 ${i % 2 === 0 ? 'bg-voice/40' : 'bg-voice'}`}
          style={{ height: 12 }}
        />
      ))}
    </span>
  );
}

function Home() {
  return (
    <div className="bg-background">
      {/* 1. HERO */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-gutter-desktop items-start">
          <div className="lg:col-span-6 flex flex-col justify-center lg:pr-4">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-voice animate-pulse" />
              <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted">
                OPEN SOURCE • VOICE → STRUCTURED DATA
              </span>
            </div>

            <h1 className="font-display-hero text-[48px] md:text-display-hero leading-[1.08] text-text-primary tracking-tight font-bold mb-6">
              Speak.
              <br />
              Audentra handles
              <br />
              the paperwork.
            </h1>

            <p className="font-body-large text-body-large text-text-secondary max-w-xl leading-relaxed mb-8">
              Audentra is an open-source voice-first form automation project that turns natural conversations into
              structured, usable data.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-8">
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
                <span>View on GitHub</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 text-text-muted font-metadata text-metadata">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-success" aria-hidden="true" />
                <span>Open source (Apache 2.0 / MIT)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-success" aria-hidden="true" />
                <span>Self-hostable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-success" aria-hidden="true" />
                <span>Built for extensibility</span>
              </div>
            </div>
          </div>

          {/* Product UI panel */}
          <div className="lg:col-span-6">
            <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="bg-surface-subtle border-b border-border px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-voice-soft text-voice font-label-code text-label-code font-medium">
                    <span className="w-2 h-2 rounded-full bg-voice animate-ping" />
                    Voice session active
                  </span>
                  <span className="font-metadata text-metadata text-text-muted hidden sm:inline">Encrypted stream</span>
                </div>
                <AnimatedWaveform id="hero-waveform" />
              </div>

              <div className="p-5 md:p-6 flex flex-col gap-5">
                <div className="bg-surface-subtle p-3.5 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-label-code text-label-code uppercase tracking-wider text-text-muted">
                      Live Acoustic Stream
                    </span>
                    <span className="font-label-code text-[11px] text-text-muted">00:14.2 s</span>
                  </div>
                  <p className="font-body text-[14px] leading-relaxed text-text-secondary italic">
                    “Patient: John Smith, born March 15th 1985. I’ve had pain in my right shoulder for about a week
                    after playing tennis.”
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-metadata text-metadata uppercase tracking-wider text-text-muted font-semibold">
                      Form Target: Patient Intake [EHR-04]
                    </span>
                    <span className="font-metadata text-metadata text-success flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" /> All entities mapped
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-metadata text-metadata text-text-secondary">Full Name</label>
                        <div className="flex items-center justify-between h-10 px-3 bg-surface border border-border rounded-lg">
                          <span className="font-body-medium text-body text-text-primary">John Smith</span>
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success font-label-code text-label-code font-medium">
                            99.8% ✓
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-metadata text-metadata text-text-secondary">Date of Birth</label>
                        <div className="flex items-center justify-between h-10 px-3 bg-surface border border-border rounded-lg">
                          <span className="font-body-medium text-body text-text-primary">15 Mar 1985</span>
                          <span className="px-2 py-0.5 rounded bg-success/10 text-success font-label-code text-label-code font-medium">
                            Verified ✓
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-metadata text-metadata text-text-secondary">Chief Complaint</label>
                      <div className="flex items-center justify-between h-10 px-3 bg-surface border border-border rounded-lg">
                        <span className="font-body-medium text-body text-text-primary">Right shoulder pain</span>
                        <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">
                          Extracted
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-metadata text-metadata text-text-secondary">Duration</label>
                        <div className="flex items-center justify-between h-10 px-3 bg-surface border border-border rounded-lg">
                          <span className="font-body-medium text-body text-text-primary">1 week (7 days)</span>
                          <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">
                            Extracted
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="font-metadata text-metadata text-text-secondary">Clinical Context</label>
                        <div className="flex items-center justify-between h-10 px-3 bg-surface border border-border rounded-lg">
                          <span className="font-body-medium text-body text-text-primary truncate">Sports activity (Tennis)</span>
                          <span className="px-2 py-0.5 rounded bg-voice-soft text-voice font-label-code text-label-code font-medium">
                            Extracted
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between">
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
                      <span className="font-label-code text-[11px] text-text-muted">48kHz lossless • Low latency</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-label-code text-label-code text-text-muted">Sampling</span>
                    <span className="w-2 h-2 rounded-full bg-success" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TECHNICAL PROJECT HIGHLIGHTS STRIP */}
      <section className="w-full border-y border-border bg-surface-subtle/50 py-10">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="py-4 sm:py-0 sm:px-6 first:pl-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="font-label-code text-label-code font-bold uppercase tracking-wider text-text-primary">
                  OPEN SOURCE
                </span>
              </div>
              <div className="font-metadata text-metadata text-text-secondary">
                Source available on GitHub under permissive licenses.
              </div>
            </div>
            <div className="py-4 sm:py-0 sm:px-6 space-y-1.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="font-label-code text-label-code font-bold uppercase tracking-wider text-text-primary">
                  SELF-HOSTABLE
                </span>
              </div>
              <div className="font-metadata text-metadata text-text-secondary">
                Run your own instance via Docker & Kubernetes.
              </div>
            </div>
            <div className="py-4 sm:py-0 sm:px-6 space-y-1.5">
              <div className="flex items-center gap-2">
                <AudioWaveform className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="font-label-code text-label-code font-bold uppercase tracking-wider text-text-primary">
                  VOICE FIRST
                </span>
              </div>
              <div className="font-metadata text-metadata text-text-secondary">
                Streaming 48kHz natural speech parsing pipeline.
              </div>
            </div>
            <div className="py-4 sm:py-0 sm:px-6 last:pr-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="font-label-code text-label-code font-bold uppercase tracking-wider text-text-primary">
                  EXTENSIBLE
                </span>
              </div>
              <div className="font-metadata text-metadata text-text-secondary">
                Custom JSON & Pydantic form schemas for any domain.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="max-w-2xl mb-14">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-3">
            Architecture & Flow
          </span>
          <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            From conversation to completed form.
          </h2>
          <p className="font-body-large text-body-large text-text-secondary">
            A single continuous pipeline designed to eliminate manual data entry in high-stakes documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          <div className="hidden md:block absolute top-4 left-[10%] right-[10%] h-[1px] bg-border -z-0" />
          {[
            { n: '01', t: 'Speak naturally', d: 'User talks normally. No rigid commands or robotic dictation formats.' },
            { n: '02', t: 'Audentra understands', d: 'The engine extracts entities, context, and structural relationships.' },
            { n: '03', t: 'Review structured data', d: 'Information maps cleanly into designated schema fields for instant operator sign-off.' },
            { n: '04', t: 'Submit & Sync', d: 'Instant payload dispatch into target database, EHR, or custom webhook endpoints.' },
          ].map((s) => (
            <div key={s.n} className="relative bg-background pt-2 md:pt-0">
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-label-code text-label-code font-bold text-text-primary mb-4 z-10">
                {s.n}
              </div>
              <h3 className="font-headline-h3 text-[18px] text-text-primary mb-2 font-semibold">{s.t}</h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PRODUCT INTELLIGENCE */}
      <section className="w-full bg-surface py-16 md:py-28 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-12">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
              Contextual Intelligence
            </span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              It doesn’t just transcribe. It understands.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Generic transcription dumps unorganized text. Audentra isolates anatomical terms, timing anchors,
              triggers, and negative findings simultaneously.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-surface-subtle p-6 md:p-8 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                  <span className="font-metadata text-metadata uppercase tracking-wider text-text-muted font-semibold">
                    Raw Spoken Speech
                  </span>
                  <span className="font-label-code text-label-code text-voice bg-voice-soft px-2 py-0.5 rounded">
                    Acoustic Input
                  </span>
                </div>
                <p className="font-body-large text-body-large text-text-primary leading-relaxed">
                  “Patient says the{' '}
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium border-b border-primary">
                    shoulder
                  </span>{' '}
                  started hurting after tennis{' '}
                  <span className="bg-voice/10 text-voice px-1.5 py-0.5 rounded font-medium border-b border-voice">
                    last Tuesday
                  </span>
                  .{' '}
                  <span className="bg-error/10 text-error px-1.5 py-0.5 rounded font-medium border-b border-error">
                    No swelling
                  </span>
                  . Pain is around a{' '}
                  <span className="bg-warning/15 text-text-primary px-1.5 py-0.5 rounded font-medium border-b border-warning">
                    six
                  </span>{' '}
                  when lifting the arm.”
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-border flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-label-code text-[11px] text-text-secondary">
                  <span className="w-2 h-2 rounded bg-primary" /> Location
                </span>
                <span className="inline-flex items-center gap-1.5 font-label-code text-[11px] text-text-secondary">
                  <span className="w-2 h-2 rounded bg-voice" /> Onset
                </span>
                <span className="inline-flex items-center gap-1.5 font-label-code text-[11px] text-text-secondary">
                  <span className="w-2 h-2 rounded bg-error" /> Negative Finding
                </span>
                <span className="inline-flex items-center gap-1.5 font-label-code text-[11px] text-text-secondary">
                  <span className="w-2 h-2 rounded bg-warning" /> Severity
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 bg-surface p-6 md:p-8 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
                  <span className="font-metadata text-metadata uppercase tracking-wider text-text-muted font-semibold">
                    Audentra Structured Extraction
                  </span>
                  <span className="font-label-code text-label-code text-success bg-success/10 px-2 py-0.5 rounded">
                    Parsed JSON Schema
                  </span>
                </div>
                <div className="space-y-3 font-body text-body">
                  <div className="flex items-start justify-between py-2 border-b border-border/70">
                    <span className="font-metadata text-metadata text-text-muted">Location</span>
                    <span className="font-body-medium text-text-primary text-right font-medium">Right shoulder (Anatomical)</span>
                  </div>
                  <div className="flex items-start justify-between py-2 border-b border-border/70">
                    <span className="font-metadata text-metadata text-text-muted">Onset</span>
                    <span className="font-body-medium text-text-primary text-right font-medium">Last Tuesday (5 days prior)</span>
                  </div>
                  <div className="flex items-start justify-between py-2 border-b border-border/70">
                    <span className="font-metadata text-metadata text-text-muted">Activity Trigger</span>
                    <span className="font-body-medium text-text-primary text-right font-medium">Sports activity (Tennis)</span>
                  </div>
                  <div className="flex items-start justify-between py-2 border-b border-border/70">
                    <span className="font-metadata text-metadata text-text-muted">Edema / Swelling</span>
                    <span className="font-body-medium text-error text-right font-medium flex items-center gap-1">
                      <X className="w-4 h-4" aria-hidden="true" /> None reported [Negative flag]
                    </span>
                  </div>
                  <div className="flex items-start justify-between py-2">
                    <span className="font-metadata text-metadata text-text-muted">Pain Severity</span>
                    <span className="font-body-medium text-text-primary text-right font-medium">6 / 10 (Moderate to Severe)</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="font-label-code text-[11px] text-text-muted">Confidence Score: 0.994</span>
                <span className="font-metadata text-metadata text-primary font-medium flex items-center gap-1">
                  Field mapping verified ✓
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. USE CASES */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-16 md:py-28">
        <div className="max-w-2xl mb-14">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
            Example Schemas & Use Cases
          </span>
          <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            One interface. Different workflows.
          </h2>
          <p className="font-body-large text-body-large text-text-secondary">
            Adapt Audentra to any structured workflow by defining declarative schemas. Here are three common
            open-source schema configurations.
          </p>
        </div>

        <div className="space-y-6">
          {/* Row 1: Healthcare */}
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:border-border-strong transition-colors">
            <div className="lg:max-w-md">
              <div className="inline-flex items-center gap-2 mb-3">
                <Stethoscope className="w-[22px] h-[22px] text-primary" aria-hidden="true" />
                <span className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">01 Healthcare</span>
              </div>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-4">
                Patient intake, clinical SOAP notes, and structured symptom reporting generated directly from
                clinician-patient dialogue.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">
                  schemas/patient_intake.json
                </span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">FHIR Standard</span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">SOAP Notes</span>
              </div>
            </div>
            <div className="lg:w-[480px] bg-surface-subtle rounded-lg border border-border p-4 font-label-code text-[12px] text-text-secondary">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-text-muted uppercase text-[10px]">
                <span>SOAP Document [Clinical Note]</span>
                <span className="text-success">Validated Schema</span>
              </div>
              <div className="space-y-1.5">
                <div><span className="text-text-primary font-medium">S:</span> “Reports localized dull pain in right shoulder since Tuesday.”</div>
                <div><span className="text-text-primary font-medium">O:</span> Range of motion restricted past 70 degrees elevation. No edema.</div>
                <div><span className="text-text-primary font-medium">A:</span> Acute rotator cuff strain (ICD-10: S46.011A).</div>
                <div><span className="text-text-primary font-medium">P:</span> Physical therapy referral, rest protocol 14 days.</div>
              </div>
            </div>
          </div>

          {/* Row 2: Field Work */}
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:border-border-strong transition-colors">
            <div className="lg:max-w-md">
              <div className="inline-flex items-center gap-2 mb-3">
                <HardHat className="w-[22px] h-[22px] text-warning" aria-hidden="true" />
                <span className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">02 Field Work & Safety</span>
              </div>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-4">
                Hands-free site audits, safety checklists, equipment inspection logs, and offline voice capture for
                field engineers operating without a keyboard.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">
                  schemas/site_inspection.json
                </span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">Offline Queuing</span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">GPS Geo-tagging</span>
              </div>
            </div>
            <div className="lg:w-[480px] bg-surface-subtle rounded-lg border border-border p-4 font-label-code text-[12px] text-text-secondary">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-text-muted uppercase text-[10px]">
                <span>Asset Audit: Turbine Pump #14-B</span>
                <span className="text-primary font-medium">Validated Schema</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Pressure Gauge Status:</span>
                  <span className="text-success font-medium">32.4 PSI (Nominal)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vibration Tolerance:</span>
                  <span className="text-success font-medium">Within safe range (&lt;1.8 mm/s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Casing Seal Integrity:</span>
                  <span className="text-warning font-medium">Micro-wear noted [Re-inspect]</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: HR */}
          <div className="bg-surface rounded-xl border border-border p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:border-border-strong transition-colors">
            <div className="lg:max-w-md">
              <div className="inline-flex items-center gap-2 mb-3">
                <Building2 className="w-[22px] h-[22px] text-voice" aria-hidden="true" />
                <span className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">03 Human Resources & Ops</span>
              </div>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-4">
                Structured exit interviews, candidate assessment rubrics, onboarding records, and performance debriefs
                without administrative lag.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">
                  schemas/interview_debrief.json
                </span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">Webhook Export</span>
                <span className="font-metadata text-[12px] bg-surface-subtle text-text-secondary px-2.5 py-1 rounded font-label-code">JSON Output</span>
              </div>
            </div>
            <div className="lg:w-[480px] bg-surface-subtle rounded-lg border border-border p-4 font-label-code text-[12px] text-text-secondary">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-text-muted uppercase text-[10px]">
                <span>Debrief Matrix: Senior Infrastructure Eng</span>
                <span className="text-text-muted">Validated Schema</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Distributed Architecture:</span>
                  <span className="text-primary font-medium">Exceeds (Tier 4)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cross-Functional Communication:</span>
                  <span className="text-primary font-medium">Strong (4.5 / 5)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Recommendation Signal:</span>
                  <span className="text-success font-medium">Proceed to Final Panel ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. OPEN SOURCE */}
      <section className="w-full bg-surface py-16 md:py-28 border-y border-border">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
                Community & Code
              </span>
              <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
                Built in the open.
              </h2>
              <p className="font-body-large text-body-large text-text-secondary leading-relaxed mb-8">
                Audentra is an open-source project designed to make voice-driven structured data collection accessible,
                inspectable, and extensible.
              </p>
              <div className="space-y-3 font-body-medium text-body-medium">
                <div>
                  <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-text-primary hover:text-primary transition-colors group">
                    View source <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
                <div>
                  <Link to="/documentation" className="inline-flex items-center gap-1.5 text-text-primary hover:text-primary transition-colors group">
                    Read documentation <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
                <div>
                  <a href={`${GITHUB_REPO}/issues`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-text-primary hover:text-primary transition-colors group">
                    Report an issue <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
                <div>
                  <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-text-primary hover:text-primary transition-colors group">
                    Contribute <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-[#111827] text-[#f3f4f6] rounded-xl border border-[#1f2937] shadow-sm overflow-hidden">
                <div className="bg-[#1f2937]/70 px-4 py-3 border-b border-[#374151] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444]/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b]/80 inline-block" />
                    <span className="w-3 h-3 rounded-full bg-[#10b981]/80 inline-block" />
                    <span className="font-label-code text-[12px] text-gray-400 ml-2">bash — quickstart</span>
                  </div>
                  <span className="font-label-code text-[11px] text-gray-400">Docker v26.0+</span>
                </div>
                <div className="p-5 font-label-code text-[13px] leading-relaxed space-y-3 overflow-x-auto text-gray-300">
                  <div>
                    <span className="text-gray-500"># 1. Clone repository</span>
                    <br />
                    <span className="text-[#38bdf8]">$</span> git clone https://github.com/audentra/audentra.git
                    <br />
                    <span className="text-[#38bdf8]">$</span> cd audentra
                  </div>
                  <div>
                    <span className="text-gray-500"># 2. Launch container stack</span>
                    <br />
                    <span className="text-[#38bdf8]">$</span> docker compose up -d
                  </div>
                  <div className="pt-2 border-t border-[#374151]/60 text-gray-400 text-[12px] space-y-1">
                    <div className="text-[#10b981]">✔ Container audentra-core Started</div>
                    <div className="text-[#10b981]">✔ Container audentra-ui Started</div>
                    <div className="text-[#10b981]">✔ Container acoustic-parser Started</div>
                    <div className="pt-1.5 text-gray-300">
                      → Local UI instance running at <span className="text-[#60a5fa] underline">http://localhost:3000</span>
                      <br />
                      → Speech websocket endpoint active on <span className="text-[#60a5fa]">ws://localhost:8080/stream</span>
                      <br />
                      → Custom schema loader mounted at <span className="text-amber-300">/schemas/intake.json</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRIVACY & ARCHITECTURE */}
      <section className="w-full bg-surface-subtle py-16 md:py-28 border-b border-border">
        <div className="max-w-[1200px] mx-auto px-margin md:px-margin-desktop">
          <div className="max-w-2xl mb-14">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
              Architecture & Privacy
            </span>
            <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Designed with sensitive data in mind.
            </h2>
            <p className="font-body-large text-body-large text-text-secondary">
              Engineered for local deployment and complete data sovereignty without proprietary cloud lock-in.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <Terminal className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Self-Hosting & Local Execution</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  Deploy on bare metal, air-gapped VPCs, or edge devices with full source access and zero forced network calls.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">Air-Gap Capable</span>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <Trash2 className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Configurable Storage & Zero-Retention</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  Audio buffers flush immediately post-extraction; cryptographic wipe on session close. Raw audio is never permanently stored.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">Stateless Inference Pipelines</span>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <Lock className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">End-to-End Encryption</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  TLS 1.3 in-transit, AES-256 at rest, and client-managed cryptographic key pairs (BYOK) supported out of the box.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">Open Cryptographic Standards</span>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <Cpu className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Minimal Data Footprint</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  Strict ephemeral processing pipelines without third-party model retraining. You own 100% of your telemetry and data models.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">Zero External Model Training</span>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Pluggable Auth & RBAC</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  OpenID Connect, SAML, and mTLS token verification to map permissions and protect sensitive fields across distributed teams.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">OpenID Connect & SAML</span>
            </div>
            <div className="bg-surface p-6 rounded-xl border border-border flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-surface-subtle border border-border flex items-center justify-center text-text-primary mb-4">
                  <ScrollText className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-headline-h3 text-[18px] text-text-primary font-semibold mb-2">Tamper-Evident Audit Trails</h3>
                <p className="font-body text-body text-text-secondary leading-relaxed">
                  Local immutable JSON append-only logs for verification. Every transcription, schema mapping, and operator edit is traceably hashed.
                </p>
              </div>
              <span className="font-label-code text-[11px] text-text-muted mt-6 block">Structured JSON Audit Log</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA */}
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop py-20 md:py-32">
        <div className="bg-surface rounded-2xl border border-border p-8 md:p-16 text-center flex flex-col items-center justify-center">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted mb-4 block">
            Get Started
          </span>
          <h2 className="font-headline-h2 text-headline-h2 text-text-primary font-bold tracking-tight max-w-2xl mb-4">
            Want to see it work?
          </h2>
          <p className="font-body-large text-body-large text-text-secondary max-w-xl mb-8">
            Try Audentra using the hosted demo, or explore the source and run it yourself.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
            <Link
              to="/AIVoiceAutoFill"
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
          <div className="flex items-center justify-center gap-1.5 h-8 opacity-70" aria-hidden="true">
            <span className="w-[2px] h-2 bg-voice rounded-full" />
            <span className="w-[2px] h-4 bg-primary rounded-full" />
            <span className="w-[2px] h-6 bg-voice rounded-full" />
            <span className="w-[2px] h-3 bg-primary rounded-full" />
            <span className="w-[2px] h-8 bg-voice rounded-full" />
            <span className="w-[2px] h-5 bg-primary rounded-full" />
            <span className="w-[2px] h-7 bg-voice rounded-full" />
            <span className="w-[2px] h-4 bg-primary rounded-full" />
            <span className="w-[2px] h-6 bg-voice rounded-full" />
            <span className="w-[2px] h-2 bg-primary rounded-full" />
            <span className="w-[2px] h-5 bg-voice rounded-full" />
            <span className="w-[2px] h-3 bg-primary rounded-full" />
          </div>
          <p className="font-metadata text-metadata text-text-muted mt-4">
            Open source • Self-hostable • Contributions welcome
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;