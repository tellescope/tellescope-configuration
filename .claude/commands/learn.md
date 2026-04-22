# /learn

Extract learnings from the current conversation and contribute them back to this repository as new validators, schema documentation, and/or examples for future configuration generation conversations.

## When to run this

Run `/learn` at the end of a conversation where the user has iterated on generating a Tellescope configuration — fixing validator errors, discovering undocumented fields, working around gotchas, or producing a high-quality example worth preserving. The goal is to turn session-specific knowledge into permanent, reusable repository assets.

## Critical safety rules

**You MUST follow these rules exactly. Do not deviate.**

1. **Never commit to `main`.** Before making any file changes, check the current branch. If the current branch is `main`, you MUST create a new branch before editing anything. Suggested branch name format: `learnings/<short-topic-slug>-<YYYY-MM-DD>` (e.g. `learnings/form-address-validation-2026-04-22`).
2. **If already on a non-`main` branch**, confirm with the user whether to reuse it or create a new one. Default to reusing the current branch if it looks like a working branch for this session.
3. **Never force-push.** Never run `git push --force` or `git reset --hard` against a remote branch.
4. **Never amend or rewrite commits that already exist on the remote.**

## Steps

### Step 1: Verify branch

Run `git rev-parse --abbrev-ref HEAD` to determine the current branch.

- If the current branch is `main`:
  - Stop. Do NOT modify any files yet.
  - Ask the user for a short topic slug for the new branch (or propose one based on the conversation topic).
  - Create and check out a new branch: `git checkout -b learnings/<slug>-<YYYY-MM-DD>`.
- If the current branch is anything other than `main`:
  - Tell the user which branch you're on and ask whether to (a) continue on this branch or (b) create a new branch. Default recommendation: continue on the current branch.

Do not proceed to Step 2 until you are on a non-`main` branch.

### Step 2: Review the conversation

Look back through the entire conversation and identify candidate learnings in each of these categories:

- **New validator rules**: Were there errors or misconfigurations that the validator did not catch but should have? Were there cases where the validator's suggestion was wrong or missing? Candidate validator additions go in `validator/src/`.
- **Schema documentation gaps**: Were there fields, enum values, constraints, or relationships you had to infer or guess because they weren't documented? Candidate schema updates go in `schemas/`.
- **Missing or improvable examples**: Did the conversation produce a configuration (or pattern within one) that would be a useful reference for future work? Candidate example additions go in `examples/models/{type}/` or `examples/workflows/`.
- **CLAUDE.md improvements**: Were there navigation, workflow, or quick-reference gaps that slowed down the conversation? Candidate updates go in `CLAUDE.md`.

For each candidate learning, write a one-line summary in the format:
- `[category] What was learned -> what file/change is proposed`

### Step 3: Present learnings for user approval

Show the user the full list of candidate learnings from Step 2. Ask which ones they want to include. Do NOT edit any files yet. Wait for explicit user selection before proceeding.

### Step 4: Apply the approved changes

For each approved learning:

- **Examples**: Add a new JSON file with a descriptive name. Sanitize any organization-specific IDs to placeholder MongoDB ObjectIds. Remove any PHI or real patient data.
- **Schema docs**: Edit the appropriate `schemas/*.md` file. Prefer editing existing sections over adding new top-level sections. Include concrete field examples where helpful.
- **Validator rules**: Add or update rules in `validator/src/`. After changes, run `cd validator && npm run build && cd ..` and then run the validator against any relevant example files to make sure nothing regressed.
- **CLAUDE.md**: Edit in place. Keep additions concise and aligned with existing structure.

After edits, if any example files were added or modified, validate them:
```bash
node validator/dist/cli.js <path-to-example>
```

### Step 5: Ask about submitting for review

Ask the user exactly this:

> Would you like to submit these learnings for review by the maintainers of this codebase? This will commit the changes to your current branch, push the branch, and open a pull request.

Wait for a clear yes/no answer. If the user declines, stop here and tell them the changes remain uncommitted on their local branch for them to handle manually.

### Step 6: Submit for review (only if user said yes)

Perform these steps in order. If any step fails with a permission error, STOP and follow the permission-failure instructions below.

1. Confirm you are NOT on `main` (`git rev-parse --abbrev-ref HEAD`). If somehow on `main`, abort and tell the user.
2. Stage and commit:
   ```bash
   git add -A
   git status
   ```
   Review the staged changes with the user before committing. Then:
   ```bash
   git commit -m "<concise summary of learnings added>"
   ```
   Write a clear commit message summarizing what was added (e.g. `Add SuccessRX intake example and document Address field components`).
3. Push the branch:
   ```bash
   git push -u origin <branch-name>
   ```
4. Open a PR using the GitHub CLI:
   ```bash
   gh pr create --base main --head <branch-name> --title "<same as commit>" --body "<summary of learnings, categorized by validator/schema/example/CLAUDE.md>"
   ```
5. Show the user the PR URL returned by `gh pr create`.

### Permission-failure handling

If the `git push` step fails with an error indicating the user does not have write access to the repository (common indicators: `403`, `permission denied`, `remote: Permission to ... denied`, `The requested URL returned error: 403`), OR if `gh pr create` fails with a permissions/authentication error:

1. Do NOT retry with `--force` or any workaround.
2. Tell the user exactly:

   > You do not have permission to contribute directly to this repository. Your learnings have been committed to your local branch `<branch-name>` but could not be pushed. Please contact one of the maintainers of this codebase to request write access for your GitHub account. Once your access has been granted, stay on this branch and run `/contribute-learnings` to retry the push and PR creation without re-extracting learnings.

3. Stop. Do not attempt any further remote operations.

## Notes

- Keep the set of changes small and focused. One `/learn` run should produce one PR covering one coherent theme. If the conversation surfaced many unrelated learnings, ask the user to pick the most important theme for this PR and save the rest for a follow-up.
- Never include real PHI, real patient identifiers, real email addresses, or real organization IDs in example files or commit messages. Replace with placeholder values (e.g. `507f1f77bcf86cd799439011`, `patient@example.com`).
- If the conversation contains nothing worth extracting, say so and stop — do not invent learnings to justify the command.
