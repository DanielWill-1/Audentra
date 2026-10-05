#!/usr/bin/env python3
"""P0 history rewrite: remove a path from EVERY commit in EVERY ref.

Why this exists instead of git-filter-repo / BFG / git-filter-branch
--------------------------------------------------------------------
* `git-filter-repo` and BFG could not be installed: the P0 environment has no
  shell network access (PyPI unreachable), and no binary download channel.
* `git filter-branch` ships with Git but is a POSIX shell script, and no POSIX
  shell can execute in this environment (MSYS2 fails with
  "couldn't create signal pipe, Win32 error 5" -- the sandbox blocks the pipes
  it needs). The same restriction is why `.githooks/pre-commit` cannot run here.

So the rewrite is implemented with git plumbing only -- no shell is involved.

Algorithm
---------
1. Enumerate every ref (local branches, remote-tracking branches, tags).
2. Walk every commit reachable from them, oldest-first (`rev-list --reverse
   --topo-order`), so a commit's parents are always rewritten before it.
3. For each commit:
     * read the raw commit object,
     * rebuild its root tree with the offending entry removed (`ls-tree` +
       `mktree`),
     * remap each parent through the old->new map,
     * re-emit the commit with the ORIGINAL author/committer/message verbatim
       (author and committer dates are therefore byte-preserved),
     * drop `gpgsig`/`mergetag` headers -- those signatures cannot survive a
       rewrite and keeping them would be a lie.
4. Point every ref at the rewritten tip.

Commits are NOT pruned. A commit whose only change was the removed path becomes
an empty commit; history shape and commit count are preserved.

Usage
-----
    python scripts/p0_history_rewrite.py --path service-account.json            # dry run
    python scripts/p0_history_rewrite.py --path service-account.json --apply
"""

from __future__ import annotations

import argparse
import subprocess
import sys

DROP_HEADERS = (b"gpgsig", b"mergetag")


def git(*args: str, input_bytes: bytes | None = None) -> bytes:
    proc = subprocess.run(
        ["git", *args], input=input_bytes, capture_output=True, check=False
    )
    if proc.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} failed: {proc.stderr.decode('utf-8', 'replace')}"
        )
    return proc.stdout


def list_refs() -> list[tuple[str, str, str]]:
    out = git("for-each-ref", "--format=%(refname) %(objectname) %(objecttype)")
    refs = []
    for line in out.decode().splitlines():
        parts = line.split()
        if len(parts) == 3:
            refs.append((parts[0], parts[1], parts[2]))
    return refs


def parse_commit(sha: str) -> dict:
    raw = git("cat-file", "commit", sha)
    header_blob, _, message = raw.partition(b"\n\n")

    lines = header_blob.split(b"\n")
    tree = None
    parents: list[bytes] = []
    kept: list[bytes] = []
    skipping = False
    for line in lines:
        if skipping:
            # continuation line of a multi-line header (starts with a space)
            if line.startswith(b" "):
                continue
            skipping = False
        name = line.split(b" ", 1)[0]
        if name in DROP_HEADERS:
            skipping = True
            continue
        if name == b"tree":
            tree = line.split(b" ", 1)[1].decode()
            continue
        if name == b"parent":
            parents.append(line.split(b" ", 1)[1])
            continue
        kept.append(line)
    if tree is None:
        raise RuntimeError(f"commit {sha} has no tree header")
    return {"tree": tree, "parents": parents, "rest": kept, "message": message}


EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


def filter_tree(tree: str, drop_paths: set[str]) -> tuple[str, bool]:
    """Return (new_tree, changed).

    `drop_paths` may name files or directories. A named directory is removed with
    its whole subtree; a named file is removed individually. Nested paths are
    handled by recursing into the subtrees that contain them. A directory that
    becomes empty is itself removed, so no empty `backups/` husk is left behind.
    """
    return _filter_tree(tree, "", drop_paths)


def _filter_tree(tree: str, prefix: str, drop_paths: set[str]) -> tuple[str, bool]:
    out = git("ls-tree", tree)
    kept: list[bytes] = []
    changed = False

    for line in out.split(b"\n"):
        if not line.strip():
            continue
        meta, _, raw_name = line.partition(b"\t")
        fields = meta.split()
        mode = fields[0].decode()
        sha = fields[2].decode()
        name = raw_name.decode("utf-8", "replace")
        full = prefix + name

        if full in drop_paths:
            changed = True
            continue

        if mode == "040000":
            nested = {p for p in drop_paths if p.startswith(full + "/")}
            if nested:
                new_sha, sub_changed = _filter_tree(sha, full + "/", drop_paths)
                if sub_changed:
                    changed = True
                    if new_sha == EMPTY_TREE_SHA:
                        continue  # directory became empty -> drop it
                    entry = meta.split()
                    entry[2] = new_sha.encode()
                    kept.append(b" ".join(entry) + b"\t" + raw_name)
                    continue

        kept.append(line)

    if not changed:
        return tree, False
    payload = b"\n".join(kept) + (b"\n" if kept else b"")
    return git("mktree", input_bytes=payload).decode().strip(), True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--path",
        required=True,
        action="append",
        dest="paths",
        help="repository-relative path to remove; repeatable; may be a file or a directory",
    )
    ap.add_argument("--apply", action="store_true", help="actually write new history")
    args = ap.parse_args()
    drop_paths = set(args.paths)

    refs = list_refs()
    print(f"refs to rewrite: {len(refs)}")
    for name, sha, kind in refs:
        print(f"  {kind:7} {sha[:12]} {name}")

    commits = git("rev-list", "--all", "--topo-order", "--reverse").decode().split()
    print(f"commits reachable from all refs: {len(commits)}")

    mapping: dict[str, str] = {}
    changed_commits = 0
    touched_trees = 0

    for sha in commits:
        info = parse_commit(sha)
        new_tree, tree_changed = filter_tree(info["tree"], drop_paths)
        if tree_changed:
            touched_trees += 1

        new_parents = [mapping.get(p.decode(), p.decode()) for p in info["parents"]]
        parents_changed = any(
            mapping.get(p.decode(), p.decode()) != p.decode() for p in info["parents"]
        )

        if not tree_changed and not parents_changed:
            mapping[sha] = sha  # unchanged subtree of history
            continue

        changed_commits += 1
        if not args.apply:
            mapping[sha] = sha
            continue

        body = [b"tree " + new_tree.encode()]
        body += [b"parent " + p.encode() for p in new_parents]
        body += info["rest"]
        content = b"\n".join(body) + b"\n\n" + info["message"]

        new_sha = (
            git("hash-object", "-t", "commit", "-w", "--stdin", input_bytes=content)
            .decode()
            .strip()
        )
        mapping[sha] = new_sha

    print(f"commits with a rewritten tree: {touched_trees}")
    print(f"commits needing a new object:  {changed_commits}")

    if not args.apply:
        print("\nDRY RUN -- nothing written. Re-run with --apply to rewrite.")
        return 0

    updated = 0
    for name, sha, kind in refs:
        new_sha = mapping.get(sha)
        if new_sha and new_sha != sha:
            git("update-ref", name, new_sha)
            updated += 1
            print(f"  updated {name}: {sha[:12]} -> {new_sha[:12]}")
    print(f"\nrefs updated: {updated}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"rewrite error: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(2)
