# Git Major-Change Automation

## What is enabled

This repository uses versioned hooks under `.githooks`.

- `post-commit`: automatically pushes to GitHub when the commit is considered a **major change**.
- `auto-major-commit-push.sh`: manually create an auto commit + push for major uncommitted changes.

## Major-change rule

A change is treated as major if either condition is true:

- changed files `>= 8`
- changed lines (insertions + deletions) `>= 300`

You can override thresholds with environment variables:

- `MAJOR_CHANGE_MIN_FILES`
- `MAJOR_CHANGE_MIN_LINES`

## Install hooks

Run once in this repo:

```bash
./setup-git-hooks.sh
```

or:

```bash
make install-hooks
```

This sets:

```bash
git config core.hooksPath .githooks
```

## How it works

1. You run `git commit`.
2. `.githooks/post-commit` checks HEAD shortstat.
3. If major, it runs:

```bash
git push origin <current-branch>
```

If push fails, the hook prints a manual retry command.

## Manual major auto commit + push

```bash
./git-auto-push.sh
```

This script:

1. Checks working tree diff size.
2. Only if major: `git add -A` + auto commit.
3. Pushes current branch to `origin`.

## Disable temporarily

Disable automatic post-commit push for one command:

```bash
MAJOR_AUTO_PUSH_ENABLED=0 git commit -m "..."
```

Skip auto-push from inside scripts:

```bash
SKIP_MAJOR_AUTO_PUSH=1 git commit -m "..."
```
