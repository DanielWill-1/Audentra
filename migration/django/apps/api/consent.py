from django.http import HttpRequest, JsonResponse

CLOUD_AI_CONSENT_POLICY_VERSION = "p10-cloud-ai-v2"
CLOUD_AI_CONSENT_HEADER = "X-Cloud-AI-Consent"


def has_cloud_ai_consent(request: HttpRequest, *, allow_form_field: bool = False) -> bool:
    supplied = request.headers.get(CLOUD_AI_CONSENT_HEADER, "")
    if not supplied and allow_form_field:
        supplied = request.POST.get("cloud_ai_consent_version", "")
    return supplied == CLOUD_AI_CONSENT_POLICY_VERSION


def missing_cloud_ai_consent_response() -> JsonResponse:
    return JsonResponse(
        {
            "error": "Review and accept cloud AI processing before sending data to an AI provider.",
            "code": "cloud_ai_consent_required",
            "policyVersion": CLOUD_AI_CONSENT_POLICY_VERSION,
        },
        status=428,
    )
