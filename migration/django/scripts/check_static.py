from __future__ import annotations

import argparse
import hashlib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAILWIND_VERSION = "3.4.17"
TAILWIND_SHA256 = "67f1c5e3f5a03406a7bf5badf5ada09b79f3ae78ec43450c15f7e983068da346"
TAILWIND_URL = (
    "https://github.com/tailwindlabs/tailwindcss/releases/download/"
    f"v{TAILWIND_VERSION}/tailwindcss-windows-x64.exe"
)
TAILWIND = ROOT / ".state" / "tailwindcss-windows-x64.exe"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prepare() -> None:
    TAILWIND.parent.mkdir(parents=True, exist_ok=True)
    if TAILWIND.exists():
        if sha256(TAILWIND) != TAILWIND_SHA256:
            raise SystemExit("The local Tailwind binary failed its pinned SHA-256 check.")
        return

    temporary = TAILWIND.with_suffix(".download")
    try:
        with (
            urllib.request.urlopen(TAILWIND_URL, timeout=60) as response,
            temporary.open("wb") as out,
        ):
            while block := response.read(1024 * 1024):
                out.write(block)
        if sha256(temporary) != TAILWIND_SHA256:
            raise SystemExit("The downloaded Tailwind binary failed its pinned SHA-256 check.")
        temporary.replace(TAILWIND)
    finally:
        temporary.unlink(missing_ok=True)


def verify() -> None:
    output = ROOT / "static" / "css" / "app.css"
    if not output.is_file():
        raise SystemExit("Compiled CSS is missing; run the platform-specific Tailwind build first.")
    css = output.read_text(encoding="utf-8")
    required_tokens = (
        "rgb(0 74 198/var(--tw-text-opacity,1))",
        "Hanken Grotesk",
        "JetBrains Mono",
        "4.5rem",
        "5.5rem",
        "8.5rem",
        ".app-nav-link[aria-current=page]",
        "prefers-reduced-motion:reduce",
        ".shell-dialog",
        ".mobile-drawer",
    )
    if any(token not in css for token in required_tokens):
        raise SystemExit("Compiled CSS is missing required design tokens.")


def main() -> None:
    parser = argparse.ArgumentParser()
    choice = parser.add_mutually_exclusive_group(required=True)
    choice.add_argument("--prepare", action="store_true")
    choice.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        prepare()
        print(f"Verified Tailwind CSS {TAILWIND_VERSION} ({TAILWIND_SHA256}).")
    else:
        verify()
        print("Verified primary color, Hanken Grotesk and mobile/tablet/desktop spacing tokens.")


if __name__ == "__main__":
    main()
