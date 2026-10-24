"""Build and verify the pinned Tailwind CSS asset on Render's Linux runtime."""

from __future__ import annotations

import hashlib
import platform
import subprocess
import sys
import urllib.request
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]
TAILWIND_VERSION = "3.4.17"
TAILWIND_SHA256 = "7d24f7fa191d2193b78cd5f5a42a6093e14409521908529f42d80b11fde1f1d4"
TAILWIND_URL = (
    "https://github.com/tailwindlabs/tailwindcss/releases/download/"
    f"v{TAILWIND_VERSION}/tailwindcss-linux-x64"
)
TAILWIND = PROJECT_DIR / ".state" / "tailwindcss-linux-x64"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prepare_tailwind() -> None:
    if (
        platform.system() != "Linux"
        or platform.machine().casefold() not in {"x86_64", "amd64"}
    ):
        raise SystemExit("The Render static build expects a Linux x86_64 runtime.")

    TAILWIND.parent.mkdir(parents=True, exist_ok=True)
    if not TAILWIND.exists():
        temporary = TAILWIND.with_suffix(".download")
        try:
            with (
                urllib.request.urlopen(TAILWIND_URL, timeout=60) as response,
                temporary.open("wb") as output,
            ):
                while block := response.read(1024 * 1024):
                    output.write(block)
            if sha256(temporary) != TAILWIND_SHA256:
                raise SystemExit("The downloaded Tailwind binary failed its SHA-256 check.")
            temporary.replace(TAILWIND)
        finally:
            temporary.unlink(missing_ok=True)

    if sha256(TAILWIND) != TAILWIND_SHA256:
        raise SystemExit("The cached Tailwind binary failed its SHA-256 check.")
    TAILWIND.chmod(0o755)


def main() -> None:
    prepare_tailwind()
    subprocess.run(
        [
            str(TAILWIND),
            "--config",
            "config/tailwind.config.cjs",
            "--input",
            "assets/tailwind.input.css",
            "--output",
            "static/css/app.css",
            "--minify",
        ],
        cwd=PROJECT_DIR,
        check=True,
    )
    subprocess.run(
        [sys.executable, "scripts/check_static.py", "--verify"],
        cwd=PROJECT_DIR,
        check=True,
    )


if __name__ == "__main__":
    main()
