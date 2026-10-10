
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageDraw, ImageEnhance


def compare_images(
    baseline: Path,
    candidate: Path,
    diff_output: Path,
    *,
    channel_delta: int = 24,
    max_changed_ratio: float = 0.01,
    masks: Iterable[tuple[int, int, int, int]] = (),
) -> dict[str, float | int | bool]:
    with Image.open(baseline) as opened:
        reference = opened.convert("RGB")
    with Image.open(candidate) as opened:
        current = opened.convert("RGB")

    if reference.size != current.size:
        raise ValueError(f"image dimensions differ: {reference.size} vs {current.size}")

    diff = ImageChops.difference(reference, current)
    width, height = diff.size
    mask = Image.new("L", diff.size, 0)
    drawer = ImageDraw.Draw(mask)

    for x0, y0, x1, y1 in masks:
        if x0 < 0 or y0 < 0 or x1 > width or y1 > height or x1 <= x0 or y1 <= y0:
            raise ValueError("mask rectangle is outside the image or empty")
        drawer.rectangle((x0, y0, x1 - 1, y1 - 1), fill=255)

    included_mask = ImageChops.invert(mask)
    included = width * height - mask.histogram()[255]
    if included == 0:
        raise ValueError("masks cover the entire image")

    threshold = [0 if value <= channel_delta else 255 for value in range(256)]
    channels = [channel.point(threshold) for channel in diff.split()]
    changed_image = ImageChops.lighter(ImageChops.lighter(channels[0], channels[1]), channels[2])
    changed_image = ImageChops.multiply(changed_image, included_mask)
    changed = changed_image.histogram()[255]

    ratio = changed / included
    diff_output.parent.mkdir(parents=True, exist_ok=True)
    output_mask = Image.merge("RGB", (included_mask, included_mask, included_mask))
    ImageEnhance.Brightness(ImageChops.multiply(diff, output_mask)).enhance(4).save(diff_output)
    return {
        "width": width,
        "height": height,
        "changed_pixels": changed,
        "compared_pixels": included,
        "changed_ratio": ratio,
        "channel_delta": channel_delta,
        "max_changed_ratio": max_changed_ratio,
        "within_proposed_threshold": ratio <= max_changed_ratio,
    }


def compare_directories(
    baseline_dir: Path,
    candidate_dir: Path,
    diff_dir: Path,
    *,
    channel_delta: int = 24,
    max_changed_ratio: float = 0.01,
    masks: Iterable[tuple[int, int, int, int]] = (),
) -> dict[str, object]:
    baseline_files = {path.relative_to(baseline_dir): path for path in baseline_dir.rglob("*.png")}
    candidate_files = {path.relative_to(candidate_dir): path for path in candidate_dir.rglob("*.png")}
    common = sorted(baseline_files.keys() & candidate_files.keys())
    missing = sorted(path.as_posix() for path in baseline_files.keys() - candidate_files.keys())
    extra = sorted(path.as_posix() for path in candidate_files.keys() - baseline_files.keys())
    comparisons = []
    for relative in common:
        result = compare_images(
            baseline_files[relative],
            candidate_files[relative],
            diff_dir / relative,
            channel_delta=channel_delta,
            max_changed_ratio=max_changed_ratio,
            masks=masks,
        )
        comparisons.append({
            "screenshot": relative.as_posix(),
            **result,
        })

    passed = bool(common) and not missing and not extra and all(
        item["within_proposed_threshold"] for item in comparisons
    )
    return {
        "compared": len(comparisons),
        "missing_candidates": missing,
        "unexpected_candidates": extra,
        "comparisons": comparisons,
        "within_proposed_threshold": passed,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare a screenshot or capture directory against a baseline.")
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--diff", type=Path, required=True)
    parser.add_argument("--masks", type=Path, help="JSON array of approved [x0,y0,x1,y1] rectangles")
    parser.add_argument("--channel-delta", type=int, default=24)
    parser.add_argument("--max-changed-ratio", type=float, default=0.01)
    args = parser.parse_args()

    try:
        masks = json.loads(args.masks.read_text(encoding="utf-8")) if args.masks else []
        baseline_is_directory = args.baseline.is_dir() or (
            not args.baseline.exists() and args.candidate.is_dir()
        )
        if baseline_is_directory and args.candidate.is_dir():
            result = compare_directories(
                args.baseline,
                args.candidate,
                args.diff,
                channel_delta=args.channel_delta,
                max_changed_ratio=args.max_changed_ratio,
                masks=[tuple(rect) for rect in masks],
            )
        elif args.baseline.is_file() and args.candidate.is_file():
            result = compare_images(
                args.baseline,
                args.candidate,
                args.diff,
                channel_delta=args.channel_delta,
                max_changed_ratio=args.max_changed_ratio,
                masks=[tuple(rect) for rect in masks],
            )
        else:
            raise ValueError("baseline and candidate must both be files or both be directories")
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"comparison error: {type(exc).__name__}")
        return 2

    print(json.dumps(result, sort_keys=True))
    print("Threshold values are provisional until Q18 records review acceptance.")
    return 0 if result["within_proposed_threshold"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
