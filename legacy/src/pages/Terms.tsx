function Terms() {
  return (
    <div className="bg-background">
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-28">
        <div className="max-w-3xl">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-4">
            Legal & Governance · TOU-2025-V2.1
          </span>
          <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            Terms of Use
          </h1>
          <p className="font-metadata text-metadata text-text-muted mb-12">
            Effective Date: January 1, 2025 · Revision 2.1 · Audentra Open-Source Project & Evaluator Sandbox
          </p>

          <p className="font-body-large text-body-large text-text-secondary leading-relaxed mb-2">
            These Terms of Use govern access to the website, public documentation, code repositories, and hosted
            demonstration web services. By using the hosted demo, you agree to the conditions set forth herein.
          </p>
          <p className="font-body text-body text-text-secondary leading-relaxed mb-12">
            The core engine is distributed under the Apache License 2.0. The hosted demo is a shared, public,
            rate-limited sandbox. See the Open Source License page for the full license text.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                By accessing or interacting with any endpoint associated with the Audentra Open-Source Project, you
                acknowledge that you have read, understood, and agree to be bound by these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                2. Open Source Software vs. Hosted Demo
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Self-hosted source code is governed entirely by the Apache License 2.0, with full operational
                sovereignty and offline deployment rights. The public hosted sandbox is an experimental, resource-capped
                convenience governed by these Terms. Nothing here overrides rights conveyed under the Apache 2.0 license.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                3. Acceptable Use of the Hosted Demo
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                You must not transmit protected health information (PHI), personally identifiable information (PII), or
                classified data through the public demo. Users managing regulated streams must run private self-hosted
                instances. Automated abuse, infrastructure exhaustion, and adversarial probing of the demo are
                prohibited.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                4. No Professional or Clinical Warranty
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                Audentra is experimental acoustic-linguistic middleware, not a certified medical device or professional
                advisory service. All extracted data must undergo qualified human review before use in critical
                workflows. Contributors assume no liability for actions taken on unverified output.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                5. Account Credentials & Sandbox Access
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                You are responsible for the confidentiality of any issued API keys, session tokens, or login
                identifiers. Credentials must not be hardcoded into public repositories. We may throttle, invalidate, or
                terminate credentials exhibiting suspicious activity.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                6. Intellectual Property & Code Licensing
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                The Audentra wordmark, design system, and brand assets remain the property of the project maintainers.
                Source code is licensed under the Apache License 2.0. Contributions are made under the project&apos;s CLA or
                Developer Certificate of Origin. You retain rights to any custom schemas or recordings you create.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                7. Limitation of Liability & &ldquo;As-Is&rdquo; Disclaimer
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                The hosted sandbox, website, samples, and pre-compiled libraries are provided &ldquo;as is&rdquo; and
                &ldquo;as available&rdquo;, without warranty of any kind. In no event shall the authors or maintainers be
                liable for damages arising from use of the software or demo services.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                8. Modifications & Termination
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                These Terms may be revised at any time, effective upon publication with an updated revision date.
                Continued use of the hosted demo constitutes acceptance of modified terms. We may suspend or deprecate
                public endpoints at our discretion.
              </p>
            </section>

            <section>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
                9. Contact & Governance
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                The project operates under open governance administered by the core maintainers. For questions
                concerning legal compliance or abuse reporting, contact the maintainers through the GitHub repository.
              </p>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Terms;