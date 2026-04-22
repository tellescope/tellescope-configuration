---
name: pull-latest-on-start
description: At the very start of a new conversation in this repository, fetch the latest `main` from `origin` and fast-forward pull if the current branch is `main` with a clean working tree. Ensures the session begins from up-to-date code without disturbing in-progress work on feature branches.
---

# Pull latest from main on session start

This skill keeps the local repository current at the beginning of every new conversation so that any configuration work, schema lookup, or validator run starts from the latest committed state on `main`.

## When to activate

Activate exactly once per conversation, on the first turn, before doing any other work in response to the user's opening message.

Do NOT activate when:
- The skill has already run once in this conversation.
- The user's first message is an explicit instruction that conflicts with a git fetch (e.g. "don't touch git", "I have uncommitted work, leave the tree alone"). Respect the instruction and skip.
- The working directory is not a git repository (should not happen for this repo, but guard anyway).

## What to do

Run these steps in order. Keep all output to the user to at most one short line summarizing the outcome.

1. **Check repo state.** Capture:
   - Current branch: `git rev-parse --abbrev-ref HEAD`
   - Working tree cleanliness: `git status --porcelain` (empty = clean)

2. **Fetch main.** Run `git fetch origin main`. If this fails (no network, auth issue), report the failure in one line and stop — do not attempt a pull.

3. **Decide whether to pull.**
   - If current branch is `main` AND working tree is clean: run `git pull --ff-only origin main`.
   - Otherwise: do not pull. Do not switch branches. Do not stash. The fetch alone is enough to update the remote-tracking ref.

4. **Report outcome** in exactly one short line. Examples:
   - `Pulled latest main (3 new commits).`
   - `Fetched origin/main; on branch feature-x, leaving tree alone.`
   - `Already up to date with origin/main.`
   - `Fetch failed: <short reason>. Continuing without update.`

Then proceed with the user's actual request as normal.

## Safety rules

- Never run `git pull` when the working tree is dirty.
- Never run `git pull` when the current branch is not `main`.
- Never use `--force`, `--rebase`, or `reset --hard`. Only `--ff-only` pulls are allowed.
- Never switch branches, stash, or commit on behalf of the user.
- If any git command errors unexpectedly, report the error in one line and continue with the user's request — do not block the conversation on a failed fetch.

## Interaction budget

One short status line, maximum. No multi-line summaries, no explanations of what fetch/pull do, no prompts asking the user whether to pull. The user has pre-authorized this behavior by virtue of the skill existing.
