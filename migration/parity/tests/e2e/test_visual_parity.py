
from __future__ import annotations

from pathlib import Path

import pytest
from PIL import Image

from compare_screenshots import compare_directories, compare_images


def save(path: Path, color: tuple[int, int, int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.new("RGB", (20, 20), color).save(path)


def test_identical_images_are_within_proposed_threshold(tmp_path):
    baseline = tmp_path / "base.png"
    candidate = tmp_path / "same.png"
    save(baseline, (30, 40, 50))
    save(candidate, (30, 40, 50))

    result = compare_images(baseline, candidate, tmp_path / "diff.png")
    assert result["changed_pixels"] == 0
    assert result["within_proposed_threshold"] is True


def test_changed_pixel_ratio_is_reported(tmp_path):
    baseline = tmp_path / "base.png"
    candidate = tmp_path / "changed.png"
    save(baseline, (0, 0, 0))
    save(candidate, (255, 255, 255))

    result = compare_images(baseline, candidate, tmp_path / "diff.png", max_changed_ratio=0.05)
    assert result["changed_pixels"] == 400
    assert result["within_proposed_threshold"] is False


def test_approved_mask_excludes_only_its_rectangle(tmp_path):
    baseline = tmp_path / "base.png"
    candidate = tmp_path / "changed.png"
    save(baseline, (0, 0, 0))
    save(candidate, (0, 0, 0))
    with Image.open(candidate) as image:
        image.paste((255, 255, 255), (2, 2, 7, 7))
        image.save(candidate)

    result = compare_images(
        baseline, candidate, tmp_path / "diff.png", masks=[(0, 0, 10, 10)]
    )
    assert result["changed_pixels"] == 0
    assert result["compared_pixels"] == 300


def test_dimension_mismatch_fails_instead_of_resizing(tmp_path):
    baseline = tmp_path / "base.png"
    candidate = tmp_path / "different.png"
    save(baseline, (0, 0, 0))
    Image.new("RGB", (21, 20), (0, 0, 0)).save(candidate)

    with pytest.raises(ValueError, match="dimensions differ"):
        compare_images(baseline, candidate, tmp_path / "diff.png")


def test_directory_comparison_reports_missing_and_changed_screenshots(tmp_path):
    baseline = tmp_path / "baseline"
    candidate = tmp_path / "candidate"
    save(baseline / "desktop" / "home.png", (0, 0, 0))
    save(baseline / "mobile" / "home.png", (0, 0, 0))
    save(candidate / "desktop" / "home.png", (255, 255, 255))

    result = compare_directories(baseline, candidate, tmp_path / "diffs")
    assert result["compared"] == 1
    assert result["missing_candidates"] == ["mobile/home.png"]
    assert result["within_proposed_threshold"] is False
