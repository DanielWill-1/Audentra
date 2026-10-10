def extract(
    _user_input: str,
    _form_fields: list[object],
    _current_form_data: object,
    _conversation: list[object],
) -> dict[str, object]:
    return {
        "response": "This is a mock AI response for testing purposes.",
        "extractedData": {"name": "John Doe", "email": "test@example.com"},
    }
