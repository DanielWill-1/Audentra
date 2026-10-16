export const CLOUD_AI_CONSENT_POLICY_VERSION = "p10-cloud-ai-v2";

const CONSENT_STORAGE_KEY = "audentra.cloudAiConsent";

export function hasCloudAiConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY) === CLOUD_AI_CONSENT_POLICY_VERSION;
  } catch {
    return false;
  }
}

export function grantCloudAiConsent(): boolean {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, CLOUD_AI_CONSENT_POLICY_VERSION);
    return hasCloudAiConsent();
  } catch {
    return false;
  }
}

export function withdrawCloudAiConsent(): boolean {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
    return !hasCloudAiConsent();
  } catch {
    return false;
  }
}

export function cloudAiConsentHeaders(): Record<string, string> {
  if (!hasCloudAiConsent()) {
    throw new Error("Review and accept cloud AI processing before using chat or speech.");
  }
  return { "X-Cloud-AI-Consent": CLOUD_AI_CONSENT_POLICY_VERSION };
}
