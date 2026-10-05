// Google Cloud Config
//
// P0 security remediation (see docs/security-remediation.md):
// This module used to import `service-account.json` (a Google Cloud service-account
// private key) and re-export it as GOOGLE_CLOUD_CONFIG, which placed the private key
// into the client module graph. That import and export are removed. Browser code must
// never hold Google Cloud credentials; the still-existing Express backend reads its own
// credential from an out-of-git secret mechanism.

export const GOOGLE_SPEECH_TO_TEXT_URL = "https://speech.googleapis.com/v1/speech:recognize";
export const GOOGLE_TEXT_TO_SPEECH_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

// P0 security remediation: the Groq API key is no longer read from the browser
// environment. `VITE_GROQ_API_KEY` was inlined into the shipped client bundle by Vite,
// exposing a live key to every visitor.
//
// Behaviour is preserved as far as is possible without a browser secret:
// `processWithGroq()` in src/services/ai.ts has an existing guard
// (`if (!GROQ_API_KEY) { ... return mock response }`), so the voice assistant falls back
// to that pre-existing mock path instead of sending an unauthenticated request.
//
// Server-side Groq access is introduced by P3 of docs/python-migration-plan.md
// (`POST /api/ai/extract/`). Do NOT reintroduce a VITE_-prefixed Groq key.
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_API_KEY: string | undefined = undefined;

