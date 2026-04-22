# /contribute-learnings

Retry the submission step from a previous `/learn` run. Use this when `/learn` completed the local edits and commit (or just the edits) but the push or PR creation failed due to missing repository permissions, and those permissions have since been resolved.

This command does NOT extract new learnings. It assumes the working branch already contains the learnings from a prior `/learn` run. If you want to extract new learnings, run `/learn` instead.

## Critical safety rules

**You MUST follow these rules exactly.**

1. **Never submit from `main`.** If the current branch is `main`, stop immediately and tell the user that `/learn-submit` can only run from a learnings branch created by `/learn`.
2. **Never force-push.** Never run `git push --force` or `git reset --hard` against a remote branch.
3. **Never amend or rewrite commits that already exist on the remote.**

## Steps

### Step 1: Verify branch and state

Run these checks in order:

1. `git rev-parse --abbrev-ref HEAD` — confirm the current branch is NOT `main`. If it is `main`, stop and tell the user:
   > `/contribute-learnings` must be run from the non-`main` branch that `/learn` created. Switch to that branch (e.g. `git checkout <branch-name>`) and re-run `/contribute-learnings`.
2. `git status` — check for uncommitted changes.
3. `git log --oneline origin/main..HEAD` (or the equivalent if the upstream differs) — check for local commits not yet on the remote.

Summarize state for the user: current branch name, whether there are uncommitted changes, and how many local commits are ahead of `main`.

### Step 2: Handle uncommitted changes

If there are uncommitted changes from a prior `/learn` run:

1. Show the user the output of `git status` and a short diff summary (`git diff --stat`).
2. Ask the user to confirm the changes look correct.
3. On confirmation, commit:
   ```bash
   git add -A
   git commit -m "<concise summary of learnings added>"
   ```
   Use the same commit message style as `/learn` would have used. If the prior `/learn` run proposed a commit message, reuse it.

If there are no uncommitted changes and no local commits ahead of the remote, stop and tell the user there is nothing to submit — they may be on the wrong branch, or the prior `/learn` run did not produce any changes.

### Step 3: Push the branch

```bash
git push -u origin <branch-name>
```

If this fails with a permission error (indicators: `403`, `permission denied`, `remote: Permission to ... denied`, `The requested URL returned error: 403`):

1. Do NOT retry with `--force` or any workaround.
2. Tell the user:
   > Push still failed with a permission error. Your permissions may not yet be fully propagated, or the access request has not been granted. Please verify with a maintainer that your GitHub account has write access to this repository, then re-run `/contribute-learnings`.
3. Stop.

### Step 4: Open the PR

Check whether a PR for this branch already exists:
```bash
gh pr view --json url,state 2>/dev/null
```

- If a PR already exists and is open, show the user its URL and stop — the push in Step 3 already updated it.
- If no PR exists, create one:
  ```bash
  gh pr create --base main --head <branch-name> --title "<commit subject>" --body "<summary of learnings, categorized by validator/schema/example/CLAUDE.md>"
  ```

If `gh pr create` fails with a permissions/authentication error, follow the same permission-failure response as Step 3 (tell the user, do not retry with workarounds).

### Step 5: Report

Show the user the PR URL returned by `gh pr create` (or the existing PR URL).

## Notes

- This command is idempotent in spirit: if the push succeeded but the PR creation failed previously, re-running will only create the PR. If both already succeeded, re-running will simply report the existing PR URL.
- If the user believes they have permissions but push still fails, suggest they run `gh auth status` to verify their GitHub CLI authentication matches the account that was granted access.
