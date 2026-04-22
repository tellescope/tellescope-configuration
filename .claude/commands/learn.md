# /learn

Extract learnings from the current conversation and contribute them back to this repository as new validators, schema documentation, and/or examples for future configuration generation conversations.

Running `/learn` is itself the user's authorization to execute the full workflow end-to-end: branching, editing, committing, pushing, and opening a PR. Operate autonomously. Do NOT ask the user for approval between steps. The PR itself is the review gate. Only stop early for the hard safety/error conditions listed below.

## When to run this

Run `/learn` at the end of a conversation where the user has iterated on generating a Tellescope configuration — fixing validator errors, discovering undocumented fields, working around gotchas, or producing a high-quality example worth preserving. The goal is to turn session-specific knowledge into permanent, reusable repository assets.

## Critical safety rules

**You MUST follow these rules exactly. Do not deviate.**

1. **Never commit to `main`.** Before making any file changes, you MUST create a fresh branch off the latest `origin/main` (see Step 1). This applies regardless of the branch the user started on.
2. **Never force-push.** Never run `git push --force` or `git reset --hard` against a remote branch.
3. **Never amend or rewrite commits that already exist on the remote.**
4. **Never include real PHI, real patient identifiers, real email addresses, or real organization IDs** in example files or commit messages. Replace with placeholder values (e.g. `507f1f77bcf86cd799439011`, `patient@example.com`).

## Hard stop conditions

Stop the command and tell the user — do NOT proceed or invent a workaround — if any of these are true:

- The conversation contains nothing worth extracting. Say so plainly and exit.
- A destructive operation would be required to continue (e.g. uncommitted unrelated changes that would be swept into the commit, conflicts with the remote, a dirty working tree from another task).
- A push or PR creation fails with a permission error (see Permission-failure handling).

## Steps

### Step 1: Branch setup (autonomous)

**Always create a fresh branch off the latest remote `main`.** Never reuse the current branch, even if it is already a non-`main` branch — a clean branch off latest `main` prevents accidentally bundling unrelated work and guarantees the PR is reviewable in isolation.

1. Run `git status`. If the working tree has uncommitted changes, STOP and tell the user — do not sweep them into the contribution. The user needs to commit, stash, or discard them first.
2. Fetch the latest: `git fetch origin main`.
3. Derive a short topic slug from the conversation's dominant theme (e.g. `form-address-validation`, `journey-webhook-retry`, `successrx-intake-example`).
4. Create the branch directly off the fetched remote `main`, regardless of the current branch:
   ```bash
   git checkout -b learnings/<slug>-<YYYY-MM-DD> origin/main
   ```
   Use today's date. This command both creates the branch at the tip of `origin/main` and checks it out, so the starting point is independent of whatever branch the user was previously on.
5. Confirm with `git rev-parse --abbrev-ref HEAD` that you are on the new branch and `git log --oneline -1` shows the tip of `origin/main`.

If `git fetch origin main` fails (e.g. no network, bad remote), STOP and tell the user rather than branching from a stale local `main`.

### Step 2: Extract learnings (autonomous)

Look back through the entire conversation and identify learnings in each of these categories. Apply a quality bar: include a learning only if a future configuration-generation conversation would plausibly benefit from it. Skip anything speculative, redundant with existing docs, or too narrow to generalize.

- **New validator rules** (`validator/src/`): errors or misconfigurations the validator failed to catch, or cases where its suggestion was wrong or missing.
- **Schema documentation gaps** (`schemas/*.md`): fields, enum values, constraints, or relationships that had to be inferred because they weren't documented.
- **Missing or improvable examples** (`examples/models/{type}/` or `examples/workflows/`): configurations or patterns worth preserving as references.
- **CLAUDE.md improvements**: navigation, workflow, or quick-reference gaps that slowed down the conversation.

Keep the set of changes focused on one coherent theme. If the conversation surfaced many unrelated learnings, pick the most impactful theme for this PR on your own judgment and note the dropped themes in the PR body under a `Deferred` section.

### Step 3: Apply and commit each learning atomically (autonomous)

**Each learning gets its own commit.** Do not batch multiple learnings into one commit. Do not apply all edits first and commit at the end. The workflow is strictly one-learning-at-a-time: edit, validate, commit, move on.

Before starting, re-check the branch: `git rev-parse --abbrev-ref HEAD`. Abort if somehow on `main`. Also confirm `git status` shows a clean working tree (the Step 1 check should have ensured this).

For each learning, in order:

1. **Make the minimal set of edits** that implements only this one learning:
   - **Examples**: add exactly one example file (or modify exactly one). Sanitize all organization-specific IDs, PHI, and real contact info to placeholder values.
   - **Schema docs**: edit the one relevant section in the appropriate `schemas/*.md` file. Do not opportunistically reword neighboring sections.
   - **Validator rules**: add or update the one rule in `validator/src/`. Run `cd validator && npm run build && cd ..`.
   - **CLAUDE.md**: edit only the one section relevant to this learning.
2. **Validate if applicable**: run `node validator/dist/cli.js <path>` on any example touched. If validation fails, fix it in the same commit — do not commit a broken example. If a validator rule change is involved, also re-run the validator on pre-existing relevant examples to catch regressions.
3. **Commit only the files changed for this learning**:
   ```bash
   git add <specific paths touched for this learning>
   git status   # confirm nothing unrelated is staged
   git commit -m "<imperative, specific subject line for this single learning>"
   ```
   Use `git add <paths>` — not `git add -A` — so an unrelated file can never sneak in. Commit subject must describe one change (e.g. `Document Address field sub-components in form schema`, not `Update schemas and add examples`).
4. Confirm the working tree is clean (`git status`) before starting the next learning.

Never use `git add -A` or `git commit -am` in this step. Never combine two learnings into one commit even if they touch the same file — stage the specific hunks with `git add -p` and commit them separately.

### Step 4: Push and open PR (autonomous)

Once all per-learning commits are in place:

1. Re-check the branch: `git rev-parse --abbrev-ref HEAD`. Abort if on `main`.
2. Review the commit series: `git log --oneline origin/main..HEAD`. Sanity-check that each commit is scoped to a single learning. If you notice a commit that bundles multiple learnings, stop and tell the user rather than trying to rewrite history.
3. Push:
   ```bash
   git push -u origin <branch-name>
   ```
4. Open PR:
   ```bash
   gh pr create --base main --head <branch-name> --title "<short theme summary>" --body "<PR body, see below>"
   ```
   PR body structure:
   - Short intro describing the theme.
   - A bullet list where each bullet corresponds to one commit in the series (mirroring `git log --oneline`), grouped by validator / schema / example / CLAUDE.md.
   - A `Deferred` section listing any themes intentionally dropped from this PR.
5. Report the PR URL back to the user in one line.

### Permission-failure handling

If `git push` or `gh pr create` fails with a permission/auth error (indicators: `403`, `permission denied`, `remote: Permission to ... denied`, `The requested URL returned error: 403`):

1. Do NOT retry with `--force` or any workaround.
2. Tell the user exactly:

   > You do not have permission to contribute directly to this repository. Your learnings have been committed to your local branch `<branch-name>` but could not be pushed. Please contact one of the maintainers of this codebase to request write access for your GitHub account. Once your access has been granted, stay on this branch and run `/contribute-learnings` to retry the push and PR creation without re-extracting learnings.

3. Stop. Do not attempt any further remote operations.
