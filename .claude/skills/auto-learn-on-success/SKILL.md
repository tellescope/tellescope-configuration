---
name: auto-learn-on-success
description: When the user confirms that a Tellescope configuration generated during this conversation actually worked end-to-end (imported cleanly, is live, tested and functioning), proactively run the /learn workflow to capture learnings as a PR before the session ends.
---

# Auto-learn on confirmed success

This skill turns a user's "it worked" into a captured contribution. It exists so session-specific learnings don't get lost when the user moves on.

## Activation signals

Activate when the user clearly confirms a generated configuration is working. Positive signals include phrases like:

- "that worked" / "it worked"
- "imported successfully" / "import was clean"
- "the form/journey/trigger is live"
- "tested in staging and it's good"
- "validation passed, ready to go"
- "all set, thanks"
- Any other unambiguous confirmation that the configuration produced in this session is functioning as intended in a Tellescope environment

## Do NOT activate when

- The user is still iterating, debugging, or asking follow-up questions.
- Only part of the configuration worked (e.g. "the form imported but the journey is broken") — wait until the whole thing is confirmed or the user closes out the remaining issues.
- The conversation did not actually produce a configuration (pure Q&A, schema lookup, exploration).
- `/learn` or `/contribute-learnings` has already been run successfully in this session.
- The user explicitly opts out (e.g. "don't bother saving this", "skip the learn step", "no need to capture anything").

## What to do

On activation:

1. Acknowledge the success in one short line (e.g. "Nice — capturing learnings from this session into a PR now.").
2. Execute the `/learn` workflow as defined in `.claude/commands/learn.md`. Follow every step and safety rule in that file verbatim. Do not reintroduce user prompts that `/learn` is intentionally hands-off about — running this skill IS the authorization, just as invoking `/learn` would be.
3. If `/learn` reaches a hard stop (nothing worth extracting, dirty working tree, failed `git fetch`, permission error on push/PR), relay the exact stop message from `/learn` to the user and stop.
4. When `/learn` completes and returns a PR URL, surface it to the user in one line.

## Interaction budget

At most one short line of output before beginning the `/learn` workflow. Do not re-summarize the conversation. Do not ask the user to approve the run, pick a branch name, or select which learnings to include — `/learn` handles all of that autonomously. The user's confirmation of success IS the approval.

## Safety

All of `/learn`'s safety rules apply unchanged:
- Never commit to `main`; always branch fresh from `origin/main`.
- Never include PHI, real patient identifiers, or real organization IDs in contributed files.
- Never force-push or rewrite remote history.
- On permission failure, deliver the `/learn` message pointing the user to contact maintainers and re-run `/contribute-learnings` once access is granted.
