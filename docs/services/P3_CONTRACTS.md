# P3 service contracts and source record

**Source revision:** b66efbb, plus P3 working-tree changes dated 2026-10-10.
**Purpose:** Record the mounted Express/browser behavior being ported and flag intentional transport/safety differences. This is source-derived evidence, not a claim that live providers were called.

**Review status:** [P3_REVIEW.md](P3_REVIEW.md) found default Google STT retries, incorrect Python TTS error-status mapping and a UTF-16 limit mismatch. Those code findings were corrected and regression-tested during P4; see [P4_REPORT.md](../auth/P4_REPORT.md). The [P3 scope](P3_IMPLEMENTATION_PROMPT.md) is archived. Live provider parity remains unverified.

## Sources inspected

- `server/index.ts`: mounts the transcription router at `/api` and TTS router at `/api/tts`; JSON and URL-encoded request parsers are capped at 20 MB.
- `server/routes/transcription.ts`: mounted Google Speech-to-Text recognition route and MIME/encoding/sample-rate mapping.
- `server/routes/tts.ts`: mounted Google Text-to-Speech route, text cleaning/defaults, response metadata and status mapping.
- `src/services/ai.ts`: current browser request shapes, audio validation, extraction prompt/message construction, parsing/fallback and client-visible return values.
- `src/config/api.ts`: P0 keeps the browser Groq key undefined; no provider credential should enter this client module graph.
- `src/pages/AIVoiceAutoFill.tsx`: caller flow and `normalizeKey`/field matching semantics. No page changes are part of P3.
- `src/lib/aiVoiceService.ts`, `server/routes/transcribe.ts` and `extractDataFromText` were identified as unmounted/dead reference code and are not ported.

## HTTP boundary contracts

| Django route(s) | Input | Output |
|---|---|---|
| `/api/transcribe`, `/api/transcribe/` | Legacy JSON `{audio: data URL, mimeType}`; added multipart fields `audio` and `mimeType` | `{transcript}` |
| `/api/tts`, `/api/tts/` | JSON `{text, voice?, options?}` | `{audioContent, metadata:{textLength,audioSize,voice,encoding}}` |
| `/api/ai/extract`, `/api/ai/extract/` | JSON `{userInput,formFields,currentFormData,conversation}` | `{response,extractedData}` |

Both slash forms are explicit routes. POST must not redirect. P2 `/healthz` remains. There are no page routes, database reads/writes, Storage operations or Auth flows in P3.

## Reproducible source reference

[`migration/django/tests/reference_contracts.py`](../../migration/django/tests/reference_contracts.py) is a test-only oracle transcribed from the mounted `server/routes/transcription.ts` and `server/routes/tts.ts` contracts. Run it from `migration/django/` with `uv run --offline python tests/reference_contracts.py` to print deterministic synthetic STT/TTS request and response examples. The Django adapter/service tests compare their request construction and normalization against this oracle. This is source-derived evidence: the generator does not execute Express, and no live Express-versus-Django differential request was made.

## Speech contracts

STT follows the mounted Express route: exact MIME mapping for WAV/x-WAV → LINEAR16, WebM → WEBM_OPUS, Ogg → OGG_OPUS, MP3/MPEG → MP3 and FLAC → FLAC; unknown MIME → `ENCODING_UNSPECIFIED`. WebM/Ogg specify 48000 Hz; WAV/x-WAV specify 16000 Hz; other sample-rate fields are omitted. Language is en-US, automatic punctuation is on, each result contributes its first alternative joined by `\n`, and empty output is `Transcription failed`.

The React guard caps the base64 **payload characters** at 10 * 1024 * 1024 and requires a comma in the data URL. Its 20 MB Express parser cap applies to the full JSON envelope. Django preserves the per-audio character limit, validates base64 before provider calls, maps the equivalent multipart byte ceiling to floor(10 MiB characters * 3 / 4), and enforces the full 20 MiB request-body cap. Malformed/empty payloads return a generic 4xx before provider access. Multipart audio may use Django's temporary upload handler; application code does not persist an audio file.

TTS preserves the 5000-character limit, whitespace collapse, JavaScript `\\w` ASCII set and ECMAScript whitespace set, removal of other characters, and final punctuation rule. It preserves JS `||` defaults for voice and audio options. The browser truncates text longer than 5000 characters before posting; Django's direct contract returns 400 for over-limit requests, matching the mounted Express validation. The response retains the legacy `audioContent` and `metadata` fields. The P3 React helper still returns a `data:audio/mp3;base64,...` URL, and browser audio playback is unchanged.

## Extraction and field matching

`apps/ai/prompts.py` contains the source prompt text and interpolation shape. The source-derived fixture retains the historical model id `llama3-70b-8192`. At the owner's selection, the live provider setting is `openai/gpt-oss-120b`; only the model id changes. Temperature 0.3, max_tokens 2048, top_p 0.9, non-streaming output, system-first order, prior non-system conversation role mapping, then current user input remain unchanged. Parsing tries strict JSON, then the legacy greedy brace regex, then keeps raw text with empty extracted data. Provider errors return the existing generic assistant failure message. The extraction service does not call TTS; the opt-in React path makes the same optional TTS call in the browser.

P0 changed the actual default browser behavior: `GROQ_API_KEY` is undefined in `src/config/api.ts`, so with the Django feature disabled the current helper returns its existing John Doe/test@example.com mock response. The opt-in Django path calls the server endpoint and gets the same explicit mock while `USE_MOCK_AI=true`. No Groq secret is added to client code.

Field matching removes non-ASCII-alphanumerics and lowercases; each extracted key matches the first field id or label; unmatched keys are ignored, existing values are copied and later extracted entries win. This helper is tested independently and is not yet used to alter the React page.

## Boundary and phase differences

- Server provider modes default to deterministic mocks; live Google/Groq must be enabled explicitly. A configured live-provider failure stays a failure/fallback and never silently turns into a successful mock.
- `P3_SERVICES_ENABLED` defaults false. Local use requires enabling it only in `migration/django/.env` and binding Django to `127.0.0.1:8000`. Production settings reject enabling these P3 development endpoints.
- Service POSTs require exact allowlisted browser Origin, matching Referer origin when present and the public `X-Internal-Api-Token` marker. CORS preflight is narrowly allowed. This marker is public request control, not authentication. P4 additionally requires verified identity and CSRF for session-authorized writes; see [P4_CONTRACTS.md](../auth/P4_CONTRACTS.md).
- In-process per-IP throttling uses `REMOTE_ADDR`, never forwarded headers. It is suitable only for this loopback development server, not a scaled multi-process deployment.
- P3 introduced optional bearer verification as a seam; P4 now requires a GoTrue-verified bearer or a trusted Django session principal for service requests. Invalid supplied bearer tokens fail closed and do not fall back to a session.
- Form/business validation remains log-only through P3–P9. Transport/body validation, host/origin checks and request-size guards run before provider calls. Finite per-call timeouts are configured, but default Google STT retries remain a reviewed defect until explicitly disabled.

## Provider availability

Google's official Speech and Text-to-Speech Python client docs list Python >=3.10, which includes the pinned Python 3.12 runtime. P3 locks `google-cloud-speech` 2.41.0 and `google-cloud-texttospeech` 2.38.0. [Speech client docs](https://docs.cloud.google.com/python/docs/reference/speech/latest) and [Text-to-Speech client docs](https://docs.cloud.google.com/python/docs/reference/texttospeech/latest).

Groq's [model documentation](https://console.groq.com/docs/models) currently lists `openai/gpt-oss-120b`, and its [deprecation record](https://console.groq.com/docs/deprecations) recommends it as a replacement for retired Llama models. The owner selected GPT OSS 120B. The live model is configured, while deterministic mocks remain the default. No live provider request is implied by the selection.

No real audio/provider responses are included in the synthetic fixture set. Live request construction, credentials, provider account permissions and differential output remain separately reported gates.
