import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/DanielWill-1/Audentra';

const PGP_KEY_BLOCK = `// Public Key Fingerprint (Expires 2026-12-31)
4A92 8BF1 3902 DC10 E871  990A 7712 BF30 1A09 443C
// Key ID: 0x1A09443C • Subkeys: RSA 4096 / Ed25519`;

const RETENTION_TABLE = [
  { category: 'Raw Voice Audio Stream', retention: '0 seconds (Realtime RAM)', medium: 'Volatile Linux tmpfs', training: 'NEVER' },
  { category: 'Transcribed Speech Text', retention: 'Duration of browser session', medium: 'Client IndexedDB / RAM', training: 'NEVER' },
  { category: 'Demo Sandboxed Records', retention: '60 Minutes max TTL', medium: 'Ephemeral Redis Cluster', training: 'NEVER' },
  { category: 'Web Server Access Logs', retention: '7 Days (IPs masked /24)', medium: 'Encrypted Cloudwatch Volume', training: 'Not Applicable' },
];

const TOC = [
  { id: 'philosophy', label: '1. Architectural Philosophy' },
  { id: 'self-hosted', label: '2. Self-Hosted Instances' },
  { id: 'hosted-demo', label: '3. Hosted Demo Data Retention' },
  { id: 'models', label: '4. Models & Local Inference' },
  { id: 'telemetry', label: '5. Telemetry, Cookies & Tracking' },
  { id: 'security', label: '6. Security Disclosures & PGP' },
];

function Privacy() {
  const [copied, setCopied] = useState(false);

  const copyPgp = async () => {
    try {
      await navigator.clipboard.writeText(PGP_KEY_BLOCK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy PGP key:', err);
    }
  };

  return (
    <div className="bg-background">
      <section className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-desktop pt-8 pb-16 md:pt-14 md:pb-28">
        <div className="max-w-3xl">
          <span className="font-label-code text-label-code uppercase tracking-widest text-text-muted block mb-4">
            Legal & Compliance
          </span>
          <h1 className="font-headline-h2 text-headline-h2 text-text-primary font-semibold tracking-tight mb-4">
            Privacy Notice
          </h1>
          <p className="font-metadata text-metadata text-text-muted mb-8">
            Last updated: January 15, 2025 · Version 1.4 · Applicable to Hosted Demo (demo.audentra.org) & Web Services
          </p>

          {/* Architectural sovereignty principle */}
          <div className="bg-surface rounded-xl border border-border p-6 mb-10">
            <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-3">
              Architectural Data Sovereignty Principle
            </h2>
            <p className="font-body text-body text-text-secondary leading-relaxed">
              Audentra is open-source, deterministic voice middleware. In self-hosted environments, your audio payload
              and structured models never leave your infrastructure. On our hosted public demonstration tier, all voice
              streams are strictly ephemeral, held only in volatile memory during real-time transcription.
            </p>
          </div>

          {/* On this page */}
          <div className="mb-10">
            <h2 className="font-metadata text-metadata uppercase tracking-wider text-text-muted mb-3 font-semibold">
              On this page
            </h2>
            <ul className="space-y-2">
              {TOC.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="font-body text-body text-text-secondary hover:text-text-primary transition-colors inline-flex items-center gap-2"
                  >
                    <span className="text-primary" aria-hidden="true">→</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo buffer scrub status */}
          <div className="flex flex-wrap items-center gap-3 bg-surface-subtle rounded-lg border border-border px-4 py-3 mb-10">
            <span className="font-label-code text-label-code text-text-primary">Demo Buffer Scrub: Operational</span>
            <span className="font-body text-body text-text-secondary">RAM flush triggers immediately on WebSocket socket close.</span>
          </div>

          <div className="space-y-12">
            {/* § 01 */}
            <section id="philosophy" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 01</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Architectural Privacy Philosophy
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-4">
                Voice streams represent one of the most sensitive surfaces in modern enterprise computing. A single
                spoken interaction in professional operations routinely touches protected health information (PHI),
                proprietary industrial telemetry, non-public financial metrics, or sensitive personnel conversations.
              </p>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-6">
                Traditional cloud-mediated voice transcription services introduce an unacceptable attack surface by
                routing raw acoustics to multitenant cloud servers where models train on unvetted enterprise audio.
                Audentra reverses this paradigm: our runtime executes entirely as a deterministic pipeline deployed
                within your physical VPC or edge compute nodes.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="font-body-medium text-body-medium text-text-primary mb-1">Data Sovereignty First</p>
                  <p className="font-body text-body text-text-secondary text-[15px]">
                    Transcriptions, entity extractions, and downstream database schemas originate and terminate
                    exclusively within the operator&apos;s isolated perimeter.
                  </p>
                  <span className="inline-block mt-3 font-label-code text-label-code text-primary">ZERO_FORCED_INGRESS</span>
                </div>
                <div className="bg-surface rounded-xl border border-border p-5">
                  <p className="font-body-medium text-body-medium text-text-primary mb-1">Deterministic Parsing</p>
                  <p className="font-body text-body text-text-secondary text-[15px]">
                    Entity extraction relies on strictly bound AST schema validation rather than open-ended predictive
                    API prompts that retain token states.
                  </p>
                  <span className="inline-block mt-3 font-label-code text-label-code text-voice">AIR_GAPPED_READY</span>
                </div>
              </div>
            </section>

            {/* § 02 */}
            <section id="self-hosted" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 02</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Self-Hosted & On-Premise Instances
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5">
                When you deploy Audentra using Docker containers, Kubernetes Helm charts, or bare-metal binaries
                compiled from source:
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-body text-body text-text-secondary">
                    <strong className="font-body-medium text-text-primary">100% Custody & Zero Upstream Egress:</strong>{' '}
                    The Audentra project authors, contributors, and foundation maintain zero connectivity, zero
                    telemetry reporting, and no heartbeat checks back to any central server.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-body text-body text-text-secondary">
                    <strong className="font-body-medium text-text-primary">No Analytics or Crash Beacons:</strong>{' '}
                    We deliberately omit automated Sentry or analytics packages from our core release images.
                    Diagnostics are recorded exclusively to the operator&apos;s local stdout/syslog.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-body text-body text-text-secondary">
                    <strong className="font-body-medium text-text-primary">Reproducible Builds:</strong>{' '}
                    All software artifacts are published under cryptographically signed Git commit tags with
                    deterministic SHA256 checksums, enabling direct binary auditing before internal registry ingestion.
                  </span>
                </li>
              </ul>
            </section>

            {/* § 03 */}
            <section id="hosted-demo" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 03</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Hosted Demo Data Retention (demo.audentra.org)
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-6">
                For evaluation purposes, the project operates an interactive demonstration sandbox. We apply stringent
                ephemeral processing guarantees to any voice payload spoken into the demo environment.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { step: '01', label: 'STREAM', text: 'PCM Audio Frame transported over encrypted WSS (TLS 1.3). Retained strictly inside a ring buffer in RAM.' },
                  { step: '02', label: 'PARSE', text: 'Whisper.cpp Execution — audio tensors converted to tokens on local GPU container. Never persisted to block storage.' },
                  { step: '03', label: 'EXPIRY', text: 'Volatile Memory Flush — immediate memory overwrite. Generated test records auto-scrubbed after 60 minutes.' },
                ].map((s) => (
                  <div key={s.step} className="bg-surface rounded-xl border border-border p-5 flex gap-4">
                    <span className="font-label-code text-label-code text-primary shrink-0">{s.step}</span>
                    <div>
                      <p className="font-label-code text-label-code text-text-primary mb-1">{s.label}</p>
                      <p className="font-body text-body text-text-secondary text-[15px]">{s.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left border-collapse min-w-[560px]">
                  <thead>
                    <tr className="bg-surface-subtle border-b border-border">
                      <th className="px-4 py-3 font-label-code text-label-code text-text-muted uppercase tracking-wider">Data Category</th>
                      <th className="px-4 py-3 font-label-code text-label-code text-text-muted uppercase tracking-wider">Retention Window</th>
                      <th className="px-4 py-3 font-label-code text-label-code text-text-muted uppercase tracking-wider">Storage Medium</th>
                      <th className="px-4 py-3 font-label-code text-label-code text-text-muted uppercase tracking-wider">Model Training</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RETENTION_TABLE.map((row) => (
                      <tr key={row.category} className="border-b border-border last:border-0 bg-surface">
                        <td className="px-4 py-3 font-body-medium text-body-medium text-text-primary">{row.category}</td>
                        <td className="px-4 py-3 font-body text-body text-text-secondary">{row.retention}</td>
                        <td className="px-4 py-3 font-body text-body text-text-secondary">{row.medium}</td>
                        <td className="px-4 py-3 font-body text-body text-text-secondary">{row.training}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* § 04 */}
            <section id="models" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 04</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Voice Processing & Third-Party Models
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5">
                The core transcription engine in Audentra utilizes open-weights quantized models (principally
                Whisper.cpp, distilled GGML weights, and Silero VAD).
              </p>
              <div className="bg-surface rounded-xl border border-border p-5 mb-5">
                <p className="font-body-medium text-body-medium text-text-primary mb-1">Absence of Third-Party API Relay</p>
                <p className="font-body text-body text-text-secondary text-[15px]">
                  In our hosted demo, no speech is proxied to proprietary API gateways such as OpenAI, Google Cloud
                  Speech-to-Text, or Amazon Transcribe. Speech parsing occurs entirely on isolated servers leased by
                  the Audentra foundation in Frankfurt, Germany under EU GDPR enforcement.
                </p>
              </div>
              <p className="font-body text-body text-text-secondary leading-relaxed">
                For self-hosted deployments, operators have optional adapters to route transcriptions to external
                enterprise LLMs (e.g. Anthropic, Azure OpenAI). When enabled, data handling is strictly subject to the
                operator&apos;s own commercial contract with those providers; Audentra maintains zero intermediary
                visibility.
              </p>
            </section>

            {/* § 05 */}
            <section id="telemetry" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 05</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Telemetry, Cookies & Tracking
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5">
                We adhere to a strict anti-surveillance web philosophy. We do not monetize data or deploy third-party
                advertising scripts.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-body text-body text-text-secondary">
                    <strong className="font-body-medium text-text-primary">Zero Marketing Cookies:</strong>{' '}
                    We do not integrate Google Analytics, Meta Pixels, LinkedIn Insight tags, or user re-targeting
                    scripts. No cookie banners are needed because we do not set tracking identifiers.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="font-body text-body text-text-secondary">
                    <strong className="font-body-medium text-text-primary">Session Authorization Only:</strong>{' '}
                    The only cookie utilized on audentra.org is a cryptographically secured HTTP-only token (
                    <span className="font-label-code text-label-code">__aud_demo_sid</span>) required to segregate
                    guest sandboxes.
                  </span>
                </li>
              </ul>
            </section>

            {/* § 06 */}
            <section id="security" className="scroll-mt-24">
              <span className="font-label-code text-label-code text-text-muted block mb-2">§ 06</span>
              <h2 className="font-headline-h3 text-headline-h3 text-text-primary font-semibold mb-4">
                Security Disclosures & PGP Key
              </h2>
              <p className="font-body text-body text-text-secondary leading-relaxed mb-5">
                We welcome vulnerability inquiries and audits from security researchers and privacy engineers. If you
                identify a data retention flaw or vulnerability in our runtime or demo infrastructure, please submit an
                encrypted disclosure directly to our maintainers.
              </p>

              <div className="bg-surface rounded-xl border border-border p-5 mb-5">
                <p className="font-metadata text-metadata text-text-muted mb-1">Coordinated Disclosure Contact</p>
                <p className="font-body-medium text-body-medium text-text-primary mb-4">maintainers@audentra.org</p>
                <pre className="bg-background border border-border rounded-lg p-4 overflow-x-auto font-label-code text-label-code text-text-secondary leading-relaxed">
                  {PGP_KEY_BLOCK}
                </pre>
                <button
                  onClick={copyPgp}
                  className="mt-4 inline-flex items-center gap-2 px-4 h-10 rounded-lg border border-border font-body-medium text-body-medium text-text-primary hover:bg-surface-subtle transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-success" aria-hidden="true" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" aria-hidden="true" /> Copy PGP Key
                    </>
                  )}
                </button>
              </div>

              <p className="font-body text-body text-text-secondary">
                <strong className="font-body-medium text-text-primary">Average vulnerability initial triage response:</strong>{' '}
                &lt; 24 business hours.
              </p>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="font-body text-body text-text-secondary">
                  Questions regarding data subject rights or GDPR/CCPA documentation?{' '}
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body-medium text-primary hover:text-brand-hover transition-colors"
                  >
                    Email Compliance →
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Privacy;