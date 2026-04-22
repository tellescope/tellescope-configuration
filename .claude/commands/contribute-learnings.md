# /contribute-learnings

Retry the submission step from a previous `/learn` run. Use this when `/learn` completed the local edits and commits (or just the edits) but the push or PR creation failed due to missing repository permissions, and those permissions have since been resolved.

This command does NOT extract new learnings. It assumes the working branch already contains the learnings from a prior `/learn` run. If you want to extract new learnings, run `/learn` instead.

Running `/contribute-learnings` is itself the user's authorization to commit any pending learnings edits, push the branch, and open (or update) the PR. Operate autonomously. Do NOT ask the user for approval between steps. Only stop early for the hard safety/error conditions listed below.

## Critical safety rules

**You MUST follow these rules exactly.**

1. **Never submit from `main`.** If the current branch is `main`, stop immediately and tell the user that `/contribute-learnings` must be run from the learnings branch created by `/learn`.
2. **Never force-push.** Never run `git push --force` or `git reset --hard` against a remote branch.
3. **Never amend or rewrite commits that already exist on the remote.**
4. **Never include real PHI, real patient identifiers, real email addresses, or real organization IDs** in any commit message or PR body. Replace with placeholder values where needed.

## Hard stop conditions

Stop the command and tell the user — do NOT proceed or invent a workaround — if any of these are true:

- The current branch is `main`.
- There are no uncommitted changes and no local commits ahead of `origin/main` (nothing to submit).
- The working tree has uncommitted changes that look unrelated to a prior `/learn` run (e.g. edits outside `examples/`, `schemas/`, or `validator/src/`) — do not guess which changes were intended for the learnings commit.
- A push or PR creation fails with a permission error (see Permission-failure handling).

## Steps

### Step 1: Verify branch and state (autonomous)

1. Run `git rev-parse --abbrev-ref HEAD`. If the branch is `main`, hit the hard stop and tell the user:
   > `/contribute-learnings` must be run from the non-`main` branch that `/learn` created. Switch to that branch (e.g. `git checkout <branch-name>`) and re-run `/contribute-learnings`.
2. Run `git status --porcelain` to detect uncommitted changes.
3. Run `git fetch origin main` to refresh remote state.
4. Run `git log --oneline origin/main..HEAD` to see which local commits are ahead of `origin/main`.

If there are no uncommitted changes AND no commits ahead of `origin/main`, stop and tell the user there is nothing to submit.

### Step 2: Commit any pending learnings edits (autonomous, one commit per learning)

If there are uncommitted changes:

1. Inspect them with `git diff --stat` and `git diff` to understand the scope.
2. Verify every uncommitted file is inside `examples/`, `schemas/`, or `validator/src/`. If any change touches a path outside those directories, hit the hard stop — do not commit mixed work.
3. Group the uncommitted changes by learning and commit each learning atomically, following the same rules as `/learn` Step 3:
   - One commit per learning. Never batch.
   - Use `git add <specific paths>`, never `git add -A` or `git commit -am`.
   - If multiple learnings touch the same file, use `git add -p` to stage hunks separately.
   - Commit subjects must be imperative and describe one change (e.g. `Document Address field sub-components in form schema`).
4. Confirm `git status` shows a clean working tree before moving on.

If there are no uncommitted changes but commits already exist ahead of `origin/main`, skip this step.

### Step 3: Sanity-check the commit series (autonomous)

Run `git log --oneline origin/main..HEAD`. Each commit should be scoped to a single learning. If you notice a commit that bundles multiple learnings (likely from a prior run before the one-commit-per-learning rule), proceed anyway — do NOT rewrite history on a branch that may already exist on the remote.

### Step 4: Push the branch (autonomous)

```bash
git push -u origin <branch-name>
```

If this fails with a permission error (indicators: `403`, `permission denied`, `remote: Permission to ... denied`, `The requested URL returned error: 403`):

1. Do NOT retry with `--force` or any workaround.
2. Tell the user exactly:
   > Push still failed with a permission error. Your permissions may not yet be fully propagated, or the access request has not been granted. Please verify with a maintainer that your GitHub account has write access to this repository (and that `gh auth status` shows the correct account), then re-run `/contribute-learnings`.
3. Stop. Do not attempt any further remote operations.

### Step 5: Open or update the PR (autonomous)

Check whether a PR for this branch already exists:
```bash
gh pr view --json url,state 2>/dev/null
```

- If a PR already exists and is open, the Step 4 push has already updated it. Report the existing PR URL and stop.
- If no PR exists, create one:
  ```bash
  gh pr create --base main --head <branch-name> --title "<short theme summary>" --body "<PR body, see below>"
  ```
  PR body structure (mirroring `/learn`):
  - Short intro describing the theme.
  - A bullet list where each bullet corresponds to one commit in the series (mirroring `git log --oneline origin/main..HEAD`), grouped by validator / schema / example.
  - A `Deferred` section listing any themes intentionally dropped (only if known from the prior `/learn` run).

If `gh pr create` fails with a permissions/authentication error, use the same permission-failure response as Step 4 and stop.

### Step 6: Report (autonomous)

Report the PR URL returned by `gh pr create` (or the existing PR URL) back to the user in one line. No additional commentary.

## Idempotency

This command is safe to re-run:
- If the push succeeded but PR creation failed previously, re-running skips to Step 5 and creates the PR.
- If both succeeded previously, re-running simply reports the existing PR URL.
- If new commits have been added to the branch since the last push, re-running pushes them and the existing PR picks them up automatically.
