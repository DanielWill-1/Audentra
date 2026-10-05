#!/usr/bin/env python3
"""Offline secret scanner for this repository (P0 remediation tooling).

Why this exists: gitleaks / TruffleHog / git-filter-repo could not be installed in
the P0 environment (no shell network access; see docs/security-remediation.md).
This script provides the same *function* for the checks P0 requires:

  * full-history scan over every blob reachable from every ref
    (``git rev-list --objects --all`` + ``git cat-file --batch``)
  * working-tree scan (excluding .git and node_modules)
  * a CI/pre-commit friendly exit code

It NEVER prints matched secret values. It reports only the pattern name, the
occurrence count, and non-secret locators (blob SHA prefix, file path, size).

Usage:
    python scripts/secret_scan.py --mode history
    python scripts/secret_scan.py --mode worktree
    python scripts/secret_scan.py --mode both --json out.json

Exit codes: 0 = no findings, 1 = findings, 2 = usage/environment error.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import defaultdict

# ---------------------------------------------------------------------------
# Patterns. Each entry: label -> compiled regex (bytes).
# Labels are safe to print; matches are not.
# ---------------------------------------------------------------------------
_PATTERNS: dict[str, bytes] = {
    "google_private_key_block": rb"-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----",
    "google_service_account_json": rb'"type"\s*:\s*"service_account"',
    "google_private_key_id": rb'"private_key_id"\s*:\s*"[0-9a-f]{20,}"',
    "google_api_key": rb"AIza[0-9A-Za-z_\-]{35}",
    "groq_api_key": rb"gsk_[A-Za-z0-9]{20,}",
    "openai_api_key": rb"sk-[A-Za-z0-9]{32,}",
    "anthropic_api_key": rb"sk-ant-[A-Za-z0-9_\-]{20,}",
    "github_token": rb"gh[pousr]_[A-Za-z0-9]{30,}",
    "slack_token": rb"xox[baprs]-[A-Za-z0-9\-]{10,}",
    "aws_access_key_id": rb"AKIA[0-9A-Z]{16}",
    "supabase_jwt": rb"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}",
    "postgres_uri_with_password": rb"(?:postgres|postgresql)://[^\s:/@]{1,64}:[^\s:/@]{4,64}@",
    "mysql_uri_with_password": rb"mysql://[^\s:/@]{1,64}:[^\s:/@]{4,64}@",
    "mongodb_uri_with_password": rb"mongodb(?:\+srv)?://[^\s:/@]{1,64}:[^\s:/@]{4,64}@",
    "private_key_pem_body": rb"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{64,}?-----END",
}

_COMPILED: dict[str, re.Pattern[bytes]] = {
    label: re.compile(rx) for label, rx in _PATTERNS.items()
}

# Paths whose contents are third-party or binary noise for secret purposes.
_SKIP_DIR_PARTS = {".git", "node_modules", ".vite", "__pycache__"}
_MAX_WORKTREE_BYTES = 32 * 1024 * 1024


def _run(args: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(args, capture_output=True, check=False, **kw)


# ---------------------------------------------------------------------------
# History scan
# ---------------------------------------------------------------------------
def _iter_history_blobs():
    """Yield (sha, path_or_None) for every object reachable from all refs."""
    proc = _run(["git", "rev-list", "--objects", "--all"])
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace"))
    for line in proc.stdout.decode("utf-8", "replace").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(" ", 1)
        sha = parts[0]
        path = parts[1] if len(parts) > 1 else None
        yield sha, path


def _batch_sizes(shas: list[str]) -> dict[str, int]:
    """Return {sha: size} using git cat-file --batch-check (no content read)."""
    proc = subprocess.run(
        ["git", "cat-file", "--batch-check"],
        input="\n".join(shas).encode(),
        capture_output=True,
        check=False,
    )
    sizes: dict[str, int] = {}
    for line in proc.stdout.decode("utf-8", "replace").splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[1] == "blob":
            try:
                sizes[parts[0]] = int(parts[2])
            except ValueError:
                pass
    return sizes


def _batch_contents(shas: list[str]):
    """Yield (sha, content_bytes) for blob shas using git cat-file --batch."""
    proc = subprocess.Popen(
        ["git", "cat-file", "--batch"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
    )
    assert proc.stdin and proc.stdout
    for sha in shas:
        proc.stdin.write((sha + "\n").encode())
        proc.stdin.flush()
        header = proc.stdout.readline()
        if not header:
            break
        hparts = header.split()
        if len(hparts) < 3 or hparts[1] != b"blob":
            # missing object: the next read would desync, so stop
            continue
        size = int(hparts[2])
        content = proc.stdout.read(size)
        proc.stdout.read(1)  # trailing newline
        yield sha, content
    proc.stdin.close()
    proc.wait()


def scan_history() -> dict:
    paths_for_blob: dict[str, set[str]] = defaultdict(set)
    unique: list[str] = []
    seen: set[str] = set()
    for sha, path in _iter_history_blobs():
        if path is not None:
            paths_for_blob[sha].add(path)
        if sha not in seen:
            seen.add(sha)
            unique.append(sha)

    sizes = _batch_sizes(unique)
    blob_shas = sorted(s for s in unique if s in sizes)

    findings: dict[str, list[dict]] = defaultdict(list)
    total_bytes = 0
    for sha, content in _batch_contents(blob_shas):
        total_bytes += len(content)
        for label, rx in _COMPILED.items():
            n = len(rx.findall(content))
            if n:
                findings[label].append(
                    {
                        "blob": sha[:12],
                        "size": len(content),
                        "occurrences": n,
                        "paths": sorted(paths_for_blob.get(sha, []))[:8],
                    }
                )
    return {
        "mode": "history",
        "objects_enumerated": len(unique),
        "blobs_scanned": len(blob_shas),
        "bytes_scanned": total_bytes,
        "findings": {k: v for k, v in sorted(findings.items())},
        "finding_count": sum(len(v) for v in findings.values()),
    }


# ---------------------------------------------------------------------------
# Working-tree scan
# ---------------------------------------------------------------------------
def scan_worktree(root: str = ".") -> dict:
    findings: dict[str, list[dict]] = defaultdict(list)
    files_scanned = 0
    bytes_scanned = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in _SKIP_DIR_PARTS]
        for name in filenames:
            full = os.path.join(dirpath, name)
            try:
                if os.path.getsize(full) > _MAX_WORKTREE_BYTES:
                    continue
                with open(full, "rb") as fh:
                    content = fh.read()
            except (OSError, ValueError):
                continue
            files_scanned += 1
            bytes_scanned += len(content)
            rel = os.path.relpath(full, root).replace("\\", "/")
            for label, rx in _COMPILED.items():
                n = len(rx.findall(content))
                if n:
                    findings[label].append(
                        {"path": rel, "size": len(content), "occurrences": n}
                    )
    return {
        "mode": "worktree",
        "files_scanned": files_scanned,
        "bytes_scanned": bytes_scanned,
        "findings": {k: v for k, v in sorted(findings.items())},
        "finding_count": sum(len(v) for v in findings.values()),
    }


# ---------------------------------------------------------------------------
# Index (tracked/staged) scan -- what CI and the pre-commit hook should use.
# Scans the exact blobs recorded in the index, so gitignored local secrets
# (e.g. .env, service-account.json kept on disk) do not raise false alarms.
# ---------------------------------------------------------------------------
def _index_entries() -> list[tuple[str, str]]:
    """Return [(blob_sha, path)] for every entry in the git index."""
    proc = _run(["git", "ls-files", "-s", "-z"])
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace"))
    entries: list[tuple[str, str]] = []
    for rec in proc.stdout.decode("utf-8", "replace").split("\0"):
        if not rec:
            continue
        meta, _, path = rec.partition("\t")
        parts = meta.split()
        if len(parts) >= 2:
            entries.append((parts[1], path))
    return entries


def scan_tracked() -> dict:
    entries = _index_entries()
    by_sha: dict[str, set[str]] = defaultdict(set)
    for sha, path in entries:
        by_sha[sha].add(path)
    findings: dict[str, list[dict]] = defaultdict(list)
    total = 0
    for sha, content in _batch_contents(sorted(by_sha)):
        total += len(content)
        for label, rx in _COMPILED.items():
            n = len(rx.findall(content))
            if n:
                findings[label].append(
                    {
                        "blob": sha[:12],
                        "size": len(content),
                        "occurrences": n,
                        "paths": sorted(by_sha[sha])[:8],
                    }
                )
    return {
        "mode": "tracked",
        "files_scanned": len(entries),
        "bytes_scanned": total,
        "findings": {k: v for k, v in sorted(findings.items())},
        "finding_count": sum(len(v) for v in findings.values()),
    }


# ---------------------------------------------------------------------------
# Whole-object-database scan -- deep post-rewrite verification.
# Enumerates EVERY object in .git (reachable or not), so it also catches
# secrets left behind in dangling/unreachable objects after a history rewrite.
# ---------------------------------------------------------------------------
def _all_blob_shas() -> list[tuple[str, int]]:
    proc = _run(["git", "cat-file", "--batch-all-objects", "--batch-check"])
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace"))
    blobs: list[tuple[str, int]] = []
    for line in proc.stdout.decode("utf-8", "replace").splitlines():
        parts = line.split()
        if len(parts) == 3 and parts[1] == "blob":
            try:
                blobs.append((parts[0], int(parts[2])))
            except ValueError:
                continue
    return blobs


def scan_objects() -> dict:
    blobs = _all_blob_shas()
    sizes = dict(blobs)
    findings: dict[str, list[dict]] = defaultdict(list)
    total = 0
    for sha, content in _batch_contents([s for s, _ in blobs]):
        total += len(content)
        for label, rx in _COMPILED.items():
            n = len(rx.findall(content))
            if n:
                findings[label].append(
                    {
                        "blob": sha[:12],
                        "size": sizes.get(sha, len(content)),
                        "occurrences": n,
                        "paths": ["<unreachable-or-unnamed>"],
                    }
                )
    return {
        "mode": "objects",
        "blobs_scanned": len(blobs),
        "bytes_scanned": total,
        "findings": {k: v for k, v in sorted(findings.items())},
        "finding_count": sum(len(v) for v in findings.values()),
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------
def report(result: dict) -> None:
    print(f"--- secret scan: mode={result['mode']} ---")
    if result["mode"] == "history":
        print(f"objects enumerated : {result['objects_enumerated']}")
        print(f"blobs scanned      : {result['blobs_scanned']}")
        print(f"bytes scanned      : {result['bytes_scanned']}")
    elif result["mode"] == "objects":
        print(f"blobs in object db : {result['blobs_scanned']}")
        print(f"bytes scanned      : {result['bytes_scanned']}")
    else:
        print(f"files scanned      : {result['files_scanned']}")
        print(f"bytes scanned      : {result['bytes_scanned']}")
    print(f"TOTAL FINDING SITES: {result['finding_count']}")
    if not result["findings"]:
        print("result             : CLEAN (no pattern matched)")
        return
    for label, hits in result["findings"].items():
        print(f"  [{label}] {len(hits)} site(s)")
        for h in hits:
            if "blob" in h:
                loc = h["paths"][0] if h["paths"] else "<no path>"
                print(
                    f"      blob {h['blob']}  size={h['size']}  "
                    f"n={h['occurrences']}  path={loc}"
                )
                for extra in h["paths"][1:4]:
                    print(f"          also seen at: {extra}")
            else:
                print(
                    f"      {h['path']}  size={h['size']}  n={h['occurrences']}"
                )


def main() -> int:
    ap = argparse.ArgumentParser(description="Offline repository secret scanner")
    ap.add_argument(
        "--mode",
        choices=["history", "worktree", "tracked", "objects", "both"],
        default="both",
        help=(
            "history = every blob reachable from every ref; "
            "worktree = every file on disk (excluding .git/node_modules); "
            "tracked = the git index (use this in CI/pre-commit); "
            "objects = EVERY object in .git incl. unreachable (post-rewrite check); "
            "both = history + worktree"
        ),
    )
    ap.add_argument("--json", dest="json_out", default=None)
    args = ap.parse_args()

    results = []
    if args.mode == "history":
        results.append(scan_history())
    elif args.mode == "worktree":
        results.append(scan_worktree())
    elif args.mode == "tracked":
        results.append(scan_tracked())
    elif args.mode == "objects":
        results.append(scan_objects())
    else:  # both
        results.append(scan_history())
        results.append(scan_worktree())

    for r in results:
        report(r)

    total = sum(r["finding_count"] for r in results)
    print(f"=== COMBINED FINDING SITES: {total} ===")

    if args.json_out:
        with open(args.json_out, "w", encoding="utf-8") as fh:
            json.dump(results, fh, indent=2, sort_keys=True)
        print(f"json written to {args.json_out}")

    return 1 if total else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"scanner error: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(2)
