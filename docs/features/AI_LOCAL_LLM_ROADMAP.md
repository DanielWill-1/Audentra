# Local LLM and alternative extraction roadmap

**Status:** Proposed roadmap; implementation and provider settings are unchanged.  
**Date:** 2026-10-25

## Goal

Replace Groq for the app's conversational form-filling and text extraction with a small model served by the VoiceForm deployment. Keep a low-resource, no-LLM option for machines that cannot run the model well, and retain cloud inference only as an explicit, consented option if the owner chooses it.

In this roadmap, **local** means inference runs in a process controlled by the app operator, preferably on the Django host or a private adjacent host. It does not mean inference runs in the visitor's browser: requests already reach Django, and the Django host would send the prompt to its local/private model service. A browser/on-device model is a separate future project.

## Scope and current behavior

- Scope is LLM chat and structured extraction used by `/api/ai/extract/` and the AIVoiceAutoFill form flow.
- Speech recognition and speech synthesis use separate `SPEECH_BACKEND` and `TTS_BACKEND` settings. This plan does not replace Groq/Google STT or TTS.
- `apps.ai.services.extract` currently chooses the deterministic mock when `USE_MOCK_AI=true`; otherwise it calls the Groq backend. The Groq backend sends the existing prompt and conversation to the Chat Completions API.
- The response contract is `{ "response": string, "extractedData": object }`. Django then validates extracted values against the form field types/options. Preserve that validation, manual review, and explicit save flow for every backend.
- The current non-mock path requires the cloud AI consent version. Consent checks must become backend-aware: cloud mode requires cloud consent; local mode must explain that text reaches the VoiceForm server but is not sent to a third-party model provider.

Relevant implementation references: [AI backend selector](../../migration/django/apps/ai/services.py), [Groq adapter](../../migration/django/apps/ai/backends/groq.py), [prompt contract](../../migration/django/apps/ai/prompts.py), [consent handling](../../migration/django/apps/api/consent.py), and [field validation](../../migration/django/apps/voice/services.py).

## Target backend choices

Add one explicit server-side setting, for example `AI_BACKEND=mock|local|rules|groq`. Keep `mock` as the test/development default. Do not let a browser request choose a backend or supply a model-server URL. Do not automatically fall through from local inference to Groq: a failure must not silently send form content to a cloud provider.

| Mode | Purpose | Data handling |
|---|---|---|
| `local` | Primary production candidate: a quantized instruction model behind a private HTTP endpoint. | Prompt stays within the operator-controlled app host/private network. No Groq API key is required for LLM extraction. |
| `rules` | Alternative when local model resources are unavailable or the owner wants no LLM. | No inference service or third-party model call. Handle obvious field answers and ask focused clarifying questions for the rest. |
| `groq` | Optional cloud alternative during evaluation or for a deployment that cannot meet local latency/resource targets. | Cloud consent remains required. Select explicitly; never invoke automatically after a local failure. |
| `mock` | Deterministic development and automated-check behavior. | No model calls. |

For a prototype, compare [Ollama's OpenAI-compatible API](https://docs.ollama.com/api/openai-compatibility) with the [llama.cpp HTTP server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md). Both provide a familiar chat-completions shape; llama.cpp also documents schema-constrained JSON output. Keep the Django adapter behind the existing service boundary so the runtime can be changed without changing the browser contract.

Do not select a model by parameter count alone. At implementation time, shortlist small instruction-tuned quantized models, check each model's license and redistribution terms, and benchmark them on the actual deployment CPU/RAM/GPU. The model name, quantization, context limit, file size, and license must be pinned in the deployment record after that evaluation.

## Roadmap

### 0. Confirm deployment and privacy assumptions

- Confirm whether “local” means co-located with Django or a private inference host. This roadmap assumes a co-located/private server process, not visitor-device inference.
- Record the intended production host's CPU, available RAM/VRAM, disk, expected concurrent users, and acceptable warm/cold response times. The current deployment runbook describes Windows/Waitress and has no selected production host yet.
- Decide whether Groq remains an opt-in cloud mode after rollout or is removed after the local-model acceptance gate.
- Separate LLM replacement from speech-provider decisions; STT/TTS changes need their own scope and evaluation.

**Exit:** owner-approved meaning of “local,” hardware budget, cloud-consent policy, and latency targets are written down.

### 1. Freeze the behavior contract and evaluation set

- Preserve `build_messages` ordering and the current response shape during the first implementation.
- Build a small synthetic evaluation set covering names, email, dates, numbers, booleans, select/radio options, multiple answers in one turn, missing/ambiguous answers, corrections, and follow-up questions.
- Include cases where the user asks the model to ignore the form instructions, supplies text that resembles a field ID, or gives an answer that conflicts with allowed options.
- Record expected normalized fields and acceptable reply behavior. Use synthetic data only; do not put real conversations or answers in fixtures/logs.

**Exit:** baseline mock/provider contract and scoring rubric are reviewed before model selection.

### 2. Benchmark runtime and candidate models

- Prototype the model server separately from Django. Start with Ollama for ease of local setup; compare llama.cpp if lower-level model packaging, CPU behavior, or constrained JSON support is important.
- Verify the chosen server's JSON/structured-output behavior against the current `{response, extractedData}` contract. Do not assume every OpenAI-compatible endpoint implements the same response-format features.
- Measure cold start, warm latency, tokens per second, peak memory, and behavior under the expected concurrency on the intended host.
- Evaluate field correctness, option matching, clarification behavior, prompt-injection resistance, and malformed/truncated JSON on the synthetic set.
- Pin the selected model artifact/version and checksum; store model files outside Git and do not download them during production startup.

**Exit:** a candidate meets the agreed quality, latency, memory, licensing, and operational limits. If none does, choose `rules` or explicitly approved cloud mode instead of forcing a model into production.

### 3. Add a provider adapter and explicit configuration

- Add `apps/ai/backends/local.py` and route it through `apps.ai.services`; keep Groq, mock, and rules implementations separate.
- Configure a server-only `AI_BACKEND`, `AI_LOCAL_BASE_URL`, `AI_LOCAL_MODEL`, and bounded local timeout. Require the local endpoint to be loopback or an explicitly allowed private address; reject request-supplied endpoints.
- Keep the existing HTTP response contract and current server-side field validation. If local output is malformed or the local service is unavailable, return the existing safe unavailable response and leave the draft unchanged.
- Keep deterministic mocks as the default in tests and ordinary local development. Do not add model downloads, model weights, or provider secrets to the repository.

**Exit:** each backend can be selected deliberately, and local mode makes no Groq inference request.

### 4. Implement the no-LLM alternative and consent behavior

- Add `rules` mode for direct, low-ambiguity field answers using field IDs/labels, field types, and allowed options. Normalize only values the server can validate; ask a specific follow-up when matching is ambiguous.
- Keep “no LLM” mode honest about its limits. It should not claim general conversation understanding, guess personal details, or save a form automatically.
- Change consent checks to depend on the selected backend. Local and rules modes do not request *cloud* consent; the UI must still disclose that text is processed by the VoiceForm server. Groq mode continues to require the existing cloud consent policy.
- Ensure logs exclude user input, conversation content, extracted values, and model output. Keep the inference service private and do not expose its port to the public internet.

**Exit:** UI disclosure matches the actual data route, and switching to a fallback never changes data-sharing behavior without a deliberate user/deployment choice.

### 5. Validate the whole form-filling flow

- Verify server-side that unknown field IDs are ignored, values outside the field schema are rejected, and invalid outputs do not alter the draft.
- Check conversational turns, keyboard form entry, review-before-save behavior, session/CSRF boundaries, request limits, provider timeouts, and safe user-facing errors.
- Run the evaluation set against mock, local, and rules modes. Compare local quality and latency to the recorded baseline; report capability loss for rules mode.
- Exercise local model stopped, slow, malformed-response, out-of-memory, and cold-start cases. Confirm they return a safe error rather than silently calling Groq.

**Exit:** acceptance thresholds set in phase 0 pass on the intended host, and the owner accepts the rules/cloud fallback behavior.

### 6. Roll out and operate

- Start with a private local-only deployment and synthetic/browser acceptance. Keep the selected backend and model version visible in sanitized diagnostics, never user content.
- Add health/readiness checks for the inference process, bounded concurrency, request timeout, and a documented model upgrade/rollback procedure.
- Keep local mode as the default only after the owner accepts measured performance. Keep `rules` as the no-model fallback; keep Groq only if explicitly retained and consented.
- Remove the legacy Groq LLM configuration only after local acceptance and rollback review. Do not remove Groq speech settings as part of this LLM change.

**Exit:** local model operation, resource usage, privacy copy, rollback, and any remaining cloud alternative are documented for the selected host.

## Acceptance gates

- Backend selection is server-side and defaults to mock outside a deliberate deployment configuration.
- Local inference uses only the configured private endpoint; failure never triggers a hidden cloud call.
- The model returns the existing response shape and never bypasses field matching, type/option validation, or manual review/save.
- Local mode does not require a Groq key or cloud-consent token, while its UI disclosure accurately says the VoiceForm server processes the text.
- Groq mode, if retained, requires the current explicit cloud consent and can be selected only through deployment configuration.
- Rules mode works without model weights, external inference, or a model API key, and asks for clarification rather than guessing.
- Model quality, latency, memory, concurrency, license, and rollback instructions are recorded for the actual deployment hardware.
- STT/TTS behavior and settings are unchanged by this project.

## Open decisions

1. Which host and hardware will run Django and local inference?
2. What latency and concurrent-user targets are acceptable?
3. Should Groq remain an explicit user-consented alternative after local rollout, or be retired for LLM requests?
4. Does the product mean “private inference on our server” or “inference stays on each visitor's device”? The second requires a separate browser/on-device design.
