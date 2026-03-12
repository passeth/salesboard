---
name: fd
description: Claude-first frontend design relay for Codex. Use when the task is primarily about UI or UX design, layout polish, visual restyling, landing pages, dashboards, marketing sections, component refreshes, or other frontend work where Claude Code should produce a first-pass visual direction before Codex finishes responsiveness, overflow and truncation, accessibility, logic wiring, and tests.
---

# Fd

Run a Claude-first UI pass, then finish the implementation in Codex.

## Inspect The Repo First

Inspect the frontend stack, entry points, design system, and target files with Codex before invoking Claude.

Prefer a bounded file list. Narrow scopes produce better drafts and reduce edit churn.

Read [references/claude-ui-rubric.md](references/claude-ui-rubric.md) when the task needs the exact visual and implementation rubric.

## Run The Doctor Check

Run the doctor command on first use in a repository, or whenever Claude invocation fails:

```bash
python3 skills/fd/scripts/fd.py doctor
```

Run the auth probe only when needed because it triggers a real Claude request:

```bash
python3 skills/fd/scripts/fd.py doctor --check-auth
```

If the auth probe reports `Not logged in`, stop and tell the user to run `claude /login` in their own terminal.

## Choose A Mode

Use `plan` when the change is risky, greenfield, or still ambiguous. This asks Claude for a UI implementation plan without editing files.

```bash
python3 skills/fd/scripts/fd.py plan \
  --file src/app/page.tsx \
  --file src/components/Hero.tsx \
  "Restyle the landing hero to feel premium and editorial."
```

Use `apply` when the file scope is clear and you want Claude to make a first-pass draft directly in the workspace.

```bash
python3 skills/fd/scripts/fd.py apply \
  --file src/app/page.tsx \
  --file src/components/Hero.tsx \
  "Draft the new landing hero and supporting sections with a stronger visual hierarchy."
```

Pass `--context-file <path>` when Codex has already written a concise repo brief or design constraints that Claude should follow.

Pass `--entry <path>` when one file is the natural starting point.

Pass `--allow-create` only when new files are genuinely expected.

Pass `--dangerously-skip-permissions` only when the user explicitly wants a fully automated Claude edit pass and accepts the risk.

## Finish The Product In Codex

Review Claude's output and then finish the job in Codex.

Always do the following after a Claude pass:

1. Inspect the diff and remove weak visual choices.
2. Fix truncation, overflow, empty states, and mobile breakpoints.
3. Tighten semantics, keyboard access, labels, focus states, and color contrast.
4. Wire or repair business logic that Claude intentionally left shallow.
5. Add or update tests for the behavior you changed.
6. Run the relevant validation commands in the repository.

Treat Claude as the fast first-pass designer, not the final authority.

## Keep The Prompt Discipline Tight

Tell Claude exactly what screen or component to change, which files it may touch, and whether it may create files.

Tell Claude to avoid dependency installation, package-manager changes, and unrelated refactors.

Tell Claude to preserve the existing design system when one exists. Only push visual range harder on blank-canvas or marketing-oriented work.

## Recover From Failure Quickly

If `claude` is missing, tell the user to install Claude Code first.

If `claude` is installed but not logged in, tell the user to run `claude /login`.

If Claude edits too broadly, revert only the undesired hunks and rerun `apply` with a narrower file list.

If Claude needs heavy repo exploration, do that exploration in Codex first and then pass a summarized `--context-file` into `plan` or `apply`.
