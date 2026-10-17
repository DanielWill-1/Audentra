from apps.activity.presentation import CATEGORY_TYPES, event_summary, event_title


def test_review_actions_are_in_the_selected_activity_category() -> None:
    assert "review_deleted" in CATEGORY_TYPES["reviews"]
    assert event_title("review_deleted") == "Review deleted"


def test_event_summary_uses_only_allowlisted_metadata() -> None:
    summary = event_summary(
        "review_status_changed",
        {
            "from_status": "pending",
            "to_status": "approved",
            "changes": ["rating", "comment", "secret_field"],
            "comment_text": "private review content",
        },
    )

    assert summary == (
        "Changed a review decision \u00b7 Changed rating, comment \u00b7 Status: approved"
    )
    assert "secret_field" not in summary
    assert "private review content" not in summary
