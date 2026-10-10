from apps.voice.services import apply_extraction, normalize_key


def test_field_matching_uses_first_id_or_label_match_and_preserves_existing() -> None:
    fields = [
        {"id": "Full_Name", "label": "Name"},
        {"id": "alternate", "label": "Full Name"},
        {"id": "email", "label": "Email Address"},
    ]
    current = {"email": "old@example.test", "other": "keep"}
    assert normalize_key("Füll Name!") == "fllname"
    assert apply_extraction(
        {"full-name": "Ada", "EMAIL ADDRESS": "ada@example.test", "unknown": "skip"},
        fields,
        current,
    ) == {
        "Full_Name": "Ada",
        "email": "ada@example.test",
        "other": "keep",
    }


def test_colliding_extraction_keys_apply_in_input_order() -> None:
    fields = [{"id": "phone", "label": "Phone number"}]
    assert apply_extraction({"phone": "first", "PHONE": "last"}, fields, {}) == {
        "phone": "last"
    }


def test_common_date_and_selection_values_are_copied_without_coercion() -> None:
    fields = [
        {"id": "start_date", "label": "Start date"},
        {"id": "status", "label": "Current status"},
    ]
    values = {"Start Date": "2030-01-02", "Current status": "ready"}
    assert apply_extraction(values, fields, {"untouched": 7}) == {
        "start_date": "2030-01-02",
        "status": "ready",
        "untouched": 7,
    }
