# Claude UI Rubric

Use this rubric when shaping the Claude pass or judging whether the draft is worth keeping.

## Push Visual Quality

Favor strong hierarchy, deliberate spacing, expressive typography, and clear section rhythm.

Avoid generic card grids, default-looking spacing, purple-on-white defaults, and safe placeholder styling.

Use motion sparingly and intentionally. Prefer one or two meaningful transitions over noisy micro-interactions.

## Respect The Existing System

Preserve established component patterns, tokens, and layout primitives when the repository already has a design language.

Expand the visual range more aggressively only for blank-canvas, landing-page, or marketing work.

## Keep Implementation Pragmatic

Prefer edits that fit the current stack and local conventions.

Avoid dependency installation, package-manager churn, and broad refactors during the Claude pass.

Limit the edit surface to the requested files whenever possible.

## Leave The Right Work For Codex

Let Claude optimize the first-pass UI direction.

Let Codex close the product-quality loop:

- responsive behavior
- overflow and truncation
- accessibility and semantics
- logic integration
- tests and verification
