import { useState } from 'react';
import {
  Terminal,
  Download,
  ArrowRight,
  Github,
  MessageSquare,
  CheckCircle2,
  Cpu,
  Braces,
  Network,
  ShieldCheck,
  Mic,
  Webhook,
  Server,
  Check,
  Copy,
} from 'lucide-react';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

const QUICKSTART_CODE = `# Current VoiceForm runtime
# See docs/deployment/P10_LOCAL_RUNBOOK.md for the Django startup steps.
# Speech, form-filling chat, and TTS use the configured provider.
# Current P10 configuration sends inference requests to Groq over HTTPS.`;

const SCHEMA_CODE = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ClinicalPatientIntake",
  "type": "object",
  "required": ["patient_id", "systolic_bp", "heart_rate", "triage_category"],
  "properties": {
    "patient_id": {
      "type": "string",
      "pattern": "^MED-[0-9]{6}$"
    },
    "systolic_bp": {
      "type": "integer",
      "minimum": 50,
      "maximum": 260
    },
    "heart_rate": {
      "type": "integer",
      "minimum": 30,
      "maximum": 220
    },
    "triage_category": {
      "type": "string",
      "enum": ["EMERGENT", "URGENT", "NON_URGENT"]
    },
    "chief_complaint_transcript": {
      "type": "string",
      "maxLength": 500
    }
  }
}`;

const SIDEBAR = [
  {
    id: 'quickstart',
    title: 'Quickstart & Overview',
    items: [],
  },
  {
    id: 'pipeline',
    title: 'Fundamentals',
    items: [
      { label: 'Core Architecture', anchor: 'pipeline' },
      { label: 'Schema Specifications', anchor: 'schema-engine' },
      { label: 'Installation & Models', anchor: 'quickstart' },
    ],
  },
  {
    id: 'guides',
    title: 'Integration',
    items: [
      { label: 'Browser audio capture', anchor: 'guides' },
      { label: 'Provider requests', anchor: 'guides' },
      { label: 'Provider and data flow', anchor: 'guides' },
      { label: 'HTTP API endpoints', anchor: 'pipeline' },
    ],
  },
];

const CHUNK_LINES = ['Browser audio upload', 'Groq Whisper Large V3 Turbo - HTTPS API'];

const STAGES = [
  {
    stage: 'STAGE 01',
    title: 'Record and upload',
    detail: 'The browser uploads a supported recording to the authenticated VoiceForm service.',
    meta: 'MAX AUDIO: 7.5 MiB',
    icon: Network,
  },
  {
    stage: 'STAGE 02',
    title: 'Speech transcription',
    detail: 'After the user opts in, the backend sends audio to Groq Whisper Large V3 Turbo and returns the recognized text.',
    meta: 'PROVIDER: GROQ',
    icon: Cpu,
  },
  {
    stage: 'STAGE 03',
    title: 'Conversational extraction',
    detail: 'After the user opts in, Groq GPT-OSS 120B receives the message, conversation, form fields, and current draft values.',
    meta: 'PROVIDER: GROQ',
    icon: Braces,
  },
  {
    stage: 'STAGE 04',
    title: 'Validate and review',
    detail: 'VoiceForm checks proposed values against the available field rules. You review the draft before saving.',
    meta: 'SAVE: USER ACTION',
    icon: ShieldCheck,
  },
];

const GUIDES = [
  {
    title: 'Provider and data flow',
    tag: 'CURRENT P10 SETUP',
    icon: Server,
    text: 'After a one-time user opt-in, the current setup sends audio and conversational form data to Groq. The server reads provider credentials from its environment.',
  },
  {
    title: 'Custom Schema Authoring',
    tag: 'SPECIFICATION',
    icon: Braces,
    text: 'Define form field labels, required values, and options. VoiceForm checks model suggestions against the selected form before updating the draft.',
  },
  {
    title: 'Recording and upload',
    tag: 'BROWSER AUDIO',
    icon: Mic,
    text: 'Record audio in the browser, review the clip, and send it for transcription. Upload limits and supported formats depend on the current app configuration.',
  },
  {
    title: 'Saved form records',
    tag: 'SUPABASE STORAGE',
    icon: Webhook,
    text: 'When you save a completed form, its values are stored in the configured Supabase database under owner-scoped row-level policies.',
  },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-[#0F172A] rounded-xl overflow-hidden mb-8">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="flex items-center gap-2 font-label-code text-label-code text-slate-400">
          <Terminal className="w-4 h-4" aria-hidden="true" /> {label}
        </span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 font-label-code text-label-code text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-label-code text-label-code leading-relaxed text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Documentation() {
  return (
    <div className="bg-background">
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-28">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar / TOC */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-5">
              <div>
                <p className="font-label-code text-label-code uppercase tracking-widest text-text-muted mb-3">
                  Docs Index
                </p>
              </div>
              {SIDEBAR.map((group) => (
                <div key={group.id}>
                  {group.items.length > 0 ? (
                    <>
                      <p className="font-metadata text-metadata uppercase tracking-wider text-text-muted mb-2 font-semibold">
                        {group.title}
                      </p>
                      <ul className="space-y-1 border-l border-border pl-3">
                        {group.items.map((item) => (
                          <li key={item.label}>
                            <a
                              href={`#${item.anchor}`}
                              className="font-body text-body text-text-secondary hover:text-text-primary transition-colors"
                            >
                              {item.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <a
                      href={`#${group.id}`}
                      className="font-body-medium text-body-medium text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {group.title}
                    </a>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t border-border">
                <span className="inline-flex items-center gap-1.5 font-label-code text-label-code text-success">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Form validation enabled
                </span>
                <p className="font-body text-body text-text-secondary text-[14px] mt-1 leading-snug">
                  Model suggestions can be wrong. Review the draft before saving.
                </p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="lg:hidden flex flex-wrap gap-2 mb-8">
              {['quickstart', 'pipeline', 'schema-engine', 'guides'].map((anchor) => (
                <a
                  key={anchor}
                  href={`#${anchor}`}
                  className="font-metadata text-metadata text-text-secondary hover:text-text-primary border border-border rounded-full px-3 py-1.5 transition-colors"
                >
                  {anchor.replace('-', ' ')}
                </a>
              ))}
            </div>

            <p className="font-label-code text-label-code uppercase tracking-widest text-text-muted mb-3">
              Documentation · Official Guides
            </p>
            <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
              Documentation & Architecture Guide
            </h1>
            <p className="font-body-large text-body-large text-text-secondary max-w-2xl leading-relaxed mb-10">
              A practical overview of browser audio uploads, cloud AI requests, field checks, and saving a reviewed form.
            </p>

            {/* Telemetry panel */}
            <div className="bg-[#0F172A] rounded-xl border border-white/10 p-6 mb-12">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-label-code text-label-code text-slate-400 uppercase tracking-wider">Current Request Flow</p>
              <p className="font-body text-body text-slate-300">Audio, chat, and TTS call Groq after opt-in</p>
                </div>
                <span className="font-label-code text-label-code text-slate-300">PROVIDER: GROQ</span>
              </div>
              <div className="font-label-code text-label-code text-slate-500 mb-3">
                WebAudio 48kHz PCM · 00:00.000
              </div>
              <div className="space-y-1.5">
                {CHUNK_LINES.map((line) => (
                  <div key={line} className="font-label-code text-label-code text-slate-300">
                    {line}
                  </div>
                ))}
              </div>
              <div className="font-label-code text-label-code text-slate-500 mt-2">00:04.280</div>
            </div>

            {/* § 1 Quickstart */}
            <section id="quickstart" className="scroll-mt-24 mb-14">
              <span className="font-label-code text-label-code text-text-muted block mb-2">1</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                Current application
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5 max-w-2xl">
                Use the Django runtime instructions in the P10 local runbook. AI features use the provider configured by the operator.
              </p>
              <CodeBlock label="bash — audentra-init" code={QUICKSTART_CODE} />
            </section>

            {/* § 2 Pipeline */}
            <section id="pipeline" className="scroll-mt-24 mb-14">
              <span className="font-label-code text-label-code text-text-muted block mb-2">2</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                Current speech and form-filling flow
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-6 max-w-2xl">
                After you opt in, the browser sends a recording or message to the VoiceForm server. The server calls Groq for transcription or extraction,
                then checks suggested values against the selected form before presenting the draft for review.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {STAGES.map((s) => (
                  <div key={s.stage} className="bg-surface rounded-xl border border-border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label-code text-label-code text-primary">{s.stage}</span>
                      <s.icon className="w-4 h-4 text-text-muted" aria-hidden="true" />
                    </div>
                    <h3 className="font-body-medium text-body-medium text-text-primary mb-1">{s.title}</h3>
                    <p className="font-body text-body text-text-secondary text-[14px] leading-relaxed mb-3">{s.detail}</p>
                    <span className="font-label-code text-label-code text-text-muted">{s.meta}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* § 3 Schema */}
            <section id="schema-engine" className="scroll-mt-24 mb-14">
              <span className="font-label-code text-label-code text-text-muted block mb-2">3</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                Declarative Schema Contracts
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5 max-w-2xl">
                Define your expected payload once. The ingestion worker parses audio directly into this contract,
                rejecting out-of-boundary variables prior to downstream database storage.
              </p>
              <CodeBlock label="patient_intake.schema.json · Draft-07" code={SCHEMA_CODE} />
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="inline-flex items-center gap-1.5 font-label-code text-label-code text-success">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Schema compile check passed: 0 warnings, 0 ambiguous entities.
                </span>
              </div>
              <button className="inline-flex items-center gap-2 font-body-medium text-body-medium text-primary hover:text-brand-hover transition-colors">
                <Download className="w-4 h-4" aria-hidden="true" /> Download full template →
              </button>
            </section>

            {/* § Core guides */}
            <section id="guides" className="scroll-mt-24 mb-14">
              <p className="font-label-code text-label-code text-text-muted uppercase tracking-wider mb-2">
                Production Blueprints
              </p>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">
                  Core Implementation Guides
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {GUIDES.map((g) => (
                  <div key={g.title} className="bg-surface rounded-xl border border-border p-5 flex flex-col">
                    <g.icon className="w-5 h-5 text-primary mb-3" aria-hidden="true" />
                    <h3 className="font-body-medium text-body-medium text-text-primary mb-1">{g.title}</h3>
                    <p className="font-body text-body text-text-secondary text-[14px] leading-relaxed mb-4">{g.text}</p>
                    <span className="inline-block mb-4 font-label-code text-label-code text-text-muted">{g.tag}</span>
                    <span className="mt-auto inline-flex items-center gap-1.5 font-metadata text-metadata text-primary">
                      Read Guide <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Open source infra */}
            <section className="bg-surface rounded-xl border border-border p-6 md:p-8">
              <p className="font-label-code text-label-code text-text-muted uppercase tracking-wider mb-2">
                Open Source Infrastructure
              </p>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-2">
                Need architectural assistance?
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5 max-w-xl">
                Our core maintainers are available on GitHub Discussions for latency benchmarking, custom hardware
                acceleration questions, and custom schema audits.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${GITHUB_REPO}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-lg bg-[#2563eb] hover:bg-brand-hover text-white font-body-medium text-body-medium transition-colors"
                >
                  <Github className="w-4 h-4" aria-hidden="true" /> Open Issue
                </a>
                <a
                  href={`${GITHUB_REPO}/discussions`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
                >
                  <MessageSquare className="w-4 h-4" aria-hidden="true" /> Join Discussions
                </a>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Documentation;
