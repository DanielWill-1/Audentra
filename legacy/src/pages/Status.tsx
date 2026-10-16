import { Activity, ArrowUpRight, HelpCircle } from 'lucide-react';

function Status() {
  return (
    <div className="bg-background">
      <section className="mx-auto w-full max-w-[1200px] px-margin py-16 md:px-margin-desktop md:py-24">
        <div className="max-w-3xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 font-label-code text-label-code uppercase tracking-wider text-text-muted">
            <Activity className="h-4 w-4 text-warning" aria-hidden="true" />
            Status reporting
          </span>
          <h1 className="mb-5 font-headline-h2 text-headline-h2 font-semibold tracking-tight text-text-primary">
            Service status
          </h1>
          <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 md:p-8">
            <div className="mb-3 flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-warning" aria-hidden="true" />
              <h2 className="font-headline-h3 text-headline-h3 font-semibold text-text-primary">
                Live monitoring is not connected
              </h2>
            </div>
            <p className="font-body text-body leading-relaxed text-text-secondary">
              This page does not currently receive live health checks or incident data. No uptime percentage or
              operational status is reported here.
            </p>
          </div>
          <p className="mt-6 font-body text-body leading-relaxed text-text-secondary">
            For an issue with the app, please use the{' '}
            <a href="/contact" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
              Contact page
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Status;
