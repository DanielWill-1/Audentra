import { ArrowUpRight, AudioLines, Cloud, Database, FileText, Mic, ShieldCheck } from 'lucide-react';

function Privacy() {
  return (
    <div className="bg-background">
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-3xl mb-10">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-3">
            Legal &amp; data handling
          </span>
          <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            Privacy Notice
          </h1>
          <p className="font-body text-body text-text-secondary leading-relaxed">
            Last updated October 17, 2026. This notice describes the current VoiceForm application. Hosting,
            provider account settings, and retention controls can change how a deployment handles data.
          </p>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-brand-soft p-6 md:p-8 mb-12">
          <div className="flex gap-4 items-start">
            <div className="shrink-0 rounded-xl bg-white p-3 text-primary border border-primary/10">
              <Cloud className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-2">
                Voice and AI features use cloud processing
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                In the current configuration, VoiceForm sends recordings and form-filling conversation data to Groq
                after you opt in. Typed messages also use Groq. You can review the data flow below before using those features. Per-user
                provider selection and bring-your-own-key controls are not available in this release.
              </p>
              <p className="mt-3 font-body text-body text-text-secondary leading-relaxed">
                Before the first cloud AI request, you must accept a one-time consent prompt. That choice is stored in
                this browser for the current policy version, not as an account-level record. You can withdraw it from
                the voice form screen; the server then blocks future cloud AI requests until you opt in again.
              </p>
            </div>
          </div>
        </div>

        <section aria-labelledby="data-flow-title" className="mb-14">
          <div className="max-w-2xl mb-6">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
              What moves where
            </span>
            <h2 id="data-flow-title" className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">
              Your data flow
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-border bg-surface p-6">
              <Mic className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-body-medium text-body-medium text-text-primary font-semibold mb-2">
                Recorded speech
              </h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                After you opt in, the browser sends a recording to the VoiceForm server. The server forwards the audio to Groq Whisper
                Large V3 Turbo for transcription and returns the transcript. Accepted clips are limited to 7.5 MiB;
                clips above 2.5 MiB may be buffered to temporary disk by Django while being handled.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-surface p-6">
              <AudioLines className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-body-medium text-body-medium text-text-primary font-semibold mb-2">
                Chat and form draft
              </h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                After you opt in, the server sends your message, recent conversation, form fields, and current draft
                values to Groq GPT-OSS 120B. The model response is checked against the form fields before the draft is
                updated. The app does not save chat history as a separate database record.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-surface p-6">
              <FileText className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-body-medium text-body-medium text-text-primary font-semibold mb-2">
                Spoken reply
              </h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                When text-to-speech is used after you opt in, the assistant reply text is sent to Groq Orpheus and generated audio is
                returned to the browser. VoiceForm does not save that generated audio as a form record.
              </p>
            </article>
          </div>
        </section>

        <section aria-labelledby="stored-data-title" className="mb-14">
          <div className="max-w-2xl mb-6">
            <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
              Saved data
            </span>
            <h2 id="stored-data-title" className="font-headline-h3 text-headline-h3 text-text-primary font-semibold">
              What VoiceForm stores
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-surface p-6">
              <Database className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-body-medium text-body-medium text-text-primary font-semibold mb-2">
                Saved forms and templates
              </h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                When you choose Save, completed form values and template details are stored in the configured Supabase
                database. Saved form records are scoped to their owner by row-level access policies. They remain until
                deleted in the app; this code does not set an automatic expiry for them. Database backups and provider
                retention are separate.
              </p>
            </article>
            <article className="rounded-xl border border-border bg-surface p-6">
              <ShieldCheck className="w-5 h-5 text-primary mb-4" aria-hidden="true" />
              <h3 className="font-body-medium text-body-medium text-text-primary font-semibold mb-2">
                Account and session
              </h3>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Supabase Auth handles account identity. The Django application keeps a server-side session record in
                its configured database; its absolute lifetime is limited to 14 days. The app uses essential session
                and CSRF cookies. In production settings, the session cookie is HttpOnly and both cookies are Secure.
              </p>
            </article>
          </div>
          <p className="mt-4 font-body text-body text-text-secondary leading-relaxed">
            Template file uploads are kept in the private <code>template-files</code> Supabase Storage bucket and are
            available according to the template owner and sharing permissions. Deleting a saved record or file does not
            establish when provider backups or other provider-held copies expire. The current app does not provide
            self-service account deletion.
          </p>
        </section>

        <section aria-labelledby="groq-retention-title" className="rounded-2xl border border-border bg-surface-subtle p-6 md:p-8 mb-14">
          <div className="flex gap-4 items-start">
            <div className="shrink-0 rounded-xl bg-white p-3 text-primary border border-border">
              <Cloud className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-2">
                Third-party processing
              </span>
              <h2 id="groq-retention-title" className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                Groq data retention
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-3">
                The app owner confirms Zero Data Retention (ZDR) is disabled for the Groq organization used by this app.
                Groq says inference inputs and outputs are not retained by default, but may be temporarily logged for
                reliability troubleshooting or abuse investigations for up to 30 days (or longer if legally required).
                Groq also collects usage metadata that does not include customer prompts or outputs. Groq says retained
                customer data is stored in United States GCP buckets.
              </p>
              <a
                href="https://console.groq.com/docs/your-data"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-body-medium text-body-medium text-primary hover:text-brand-hover"
              >
                Read Groq’s data controls documentation
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section aria-labelledby="logs-title" className="mb-14">
          <h2 id="logs-title" className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
            Logs, cookies, and deployment
          </h2>
          <p className="font-body text-body text-text-secondary leading-relaxed">
            The Django application’s logging filter replaces application log messages with fixed event labels and
            removes exception details before writing them. This does not cover logs collected by a hosting provider,
            reverse proxy, database provider, or Groq. The production Django settings require HTTPS redirection and
            secure cookies; the public hosting region, infrastructure logs, and backup retention depend on the
            operator’s deployment.
          </p>
        </section>

        <section aria-labelledby="choices-title" className="border-t border-border pt-8">
          <h2 id="choices-title" className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
            Your choices
          </h2>
          <ul className="list-disc pl-5 space-y-2 font-body text-body text-text-secondary leading-relaxed">
            <li>Cloud chat and speech are blocked until you opt in. Typing instead of recording still sends the typed message to Groq after you opt in.</li>
            <li>You can withdraw cloud AI consent from the voice form screen. Future chat and speech requests are blocked until you opt in again.</li>
            <li>You can review the completed draft before saving it.</li>
            <li>You can delete individual saved form records in the Filled Forms area.</li>
            <li>Do not enter regulated or highly sensitive information unless your organization has reviewed this deployment and its provider terms.</li>
          </ul>
          <p className="mt-5 font-body text-body text-text-secondary leading-relaxed">
            For privacy questions, use the <a href="/contact" className="text-primary underline underline-offset-4">Contact page</a>.
            This notice does not claim HIPAA/HITECH, GDPR, CCPA, SOC 2, or ISO certification or compliance.
          </p>
        </section>
      </section>
    </div>
  );
}

export default Privacy;
