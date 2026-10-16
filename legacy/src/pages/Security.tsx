import {
  AlertTriangle,
  Activity,
  Database,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

const CONTROLS = [
  {
    icon: ShieldCheck,
    title: 'Verified account access',
    text: 'Protected Django routes require a server-verified Supabase identity. Database operations run in a transaction with that user’s PostgreSQL row-level security context.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Request boundaries',
    text: 'Service endpoints check the private request boundary, CSRF rules and allowed origins, limit request sizes, apply a per-process rate limit, and require the current cloud-consent policy version before live provider requests.',
  },
  {
    icon: KeyRound,
    title: 'Server-side provider credentials',
    text: 'Groq requests are made from the backend over HTTPS. Provider credentials are read by the server and are not part of the browser request payload.',
  },
  {
    icon: LockKeyhole,
    title: 'Session and log handling',
    text: 'The Django runtime stores sessions server-side. Its production settings use secure cookies and HTTPS redirection. Application logs are reduced to fixed event labels without request contents.',
  },
];

function Security() {
  return (
    <div className="bg-background">
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-3xl mb-10">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-3">
            Current application controls
          </span>
          <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            Security
          </h1>
          <p className="font-body-large text-body-large text-text-secondary leading-relaxed">
            This page describes controls implemented in the current Django application. Provider accounts, hosting,
            network configuration, and operational processes also affect the security of a live deployment.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-12">
          {CONTROLS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-6 md:p-7">
              <div className="w-11 h-11 rounded-xl border border-primary/10 bg-brand-soft flex items-center justify-center text-primary mb-5">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-2">{title}</h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">{text}</p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-border bg-surface p-6 md:p-8 mb-12">
          <div className="flex gap-4 items-start">
            <div className="shrink-0 rounded-xl bg-brand-soft p-3 text-primary">
              <Database className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                Database and file access
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                The development Supabase schema has owner-scoped row-level policies for saved forms and private file
                storage. The reviewed development project passed the repository’s P5/P9 schema and storage acceptance
                checks. That evidence does not certify a separate production deployment or its operator configuration.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] mb-12">
          <div className="rounded-2xl border border-border bg-surface-subtle p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">
                Cloud processing
              </h2>
            </div>
            <p className="font-body text-body text-text-secondary leading-relaxed">
              The current AI path sends audio, form fields, draft values, and conversation text to Groq after the user
              opts in. The browser communicates with the VoiceForm server first; Django rejects live-provider requests
              without the current consent policy version.
              The app owner confirms Zero Data Retention is disabled for this Groq organization. See the <a href="/privacy" className="text-primary underline underline-offset-4">Privacy Notice</a> for retention details.
            </p>
          </div>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-warning" aria-hidden="true" />
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">
                Claims not made
              </h2>
            </div>
            <p className="font-body text-body text-text-secondary leading-relaxed">
              VoiceForm does not claim end-to-end encryption, a specific at-rest encryption scheme, blockchain
              verification, a 99.99% uptime commitment, HIPAA/HITECH compliance, GDPR/CCPA compliance, SOC 2, or ISO
              27001 certification.
            </p>
          </div>
        </section>

        <section className="border-t border-border pt-8">
          <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
            Reporting a security concern
          </h2>
          <p className="font-body text-body text-text-secondary leading-relaxed">
            Contact the project through the <a href="/contact" className="text-primary underline underline-offset-4">Contact page</a>.
            Do not include user data or credentials in a report. No response-time commitment is stated here.
          </p>
        </section>
      </section>
    </div>
  );
}

export default Security;
