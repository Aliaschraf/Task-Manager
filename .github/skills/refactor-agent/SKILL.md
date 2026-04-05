---
name: refactor-agent
description: "Refactor AI-generated code safely without behavior changes. Use for cleanup, modularization, naming improvements, deduplication, type-safety hardening, and maintainability upgrades while preserving external behavior and avoiding over-engineering."
argument-hint: 'Describe target files/modules and constraints, e.g. "refactor src/components/**/*.tsx with no API changes"'
user-invocable: true
disable-model-invocation: false
---

# Refactor Agent

## Outcome

Produce behavior-preserving refactors that improve structure, readability, maintainability, consistency, and type safety in an AI-generated codebase.

## Use When

- You want to improve code quality without changing external behavior.
- Files are large, responsibilities are mixed, or logic is duplicated.
- Names are vague and intent is unclear.
- Type safety is weak or inconsistent.

## Non-Negotiable Constraints

- Do not change external behavior, inputs/outputs, API shapes, side effects, or user-facing flows.
- Do not introduce unnecessary abstractions or over-engineering.
- Prefer simple, explicit code over clever patterns.
- Preserve existing framework and architecture direction unless explicitly instructed.

## Default Decisions

- Output format: provide a brief "what changed and why" summary first, then provide full refactored code for all touched files in scope.
- Large scope handling: if the touched scope is too large for one response, split into ordered batches while still providing complete code for each batch.
- Verification policy: run tests, type-check, lint, and build when available; if any are unavailable, proceed with best-effort verification and state gaps explicitly.
- Refactor granularity: default to small iterative passes per module/function with verification between passes.

## Procedure

1. Establish behavior boundaries.
   - Identify externally observable behavior to preserve: API contracts, return values, data formats, errors, logging expectations, timing-sensitive behavior, and UI output.
   - Capture invariants and assumptions before editing.

2. Baseline and scope.
   - Inspect the target area and map responsibilities by file/function.
   - Mark no-change zones and risky zones (shared utilities, serialization, auth, persistence).
   - Define a minimal refactor scope for this pass.

3. Restructure for single responsibility.
   - Split large files into focused modules when responsibilities are mixed.
   - Keep each file and function centered on one clear purpose.
   - Group related logic coherently, preferably by feature.

4. Remove dead and duplicate code.
   - Remove unused imports, locals, branches, and unreachable code.
   - Extract duplicated logic into small reusable functions.
   - Keep extracted helpers close to their feature unless shared by multiple features.

5. Improve naming.
   - Rename vague identifiers to intent-revealing names.
   - Avoid generic names like `data`, `temp`, `value`, `item`, `handleStuff` unless domain-accurate.
   - Keep naming consistent with project conventions.

6. Refine functions and control flow.
   - Split multi-purpose functions into smaller focused units.
   - Reduce nesting with guard clauses and early returns when it improves clarity.
   - Keep branching explicit and easy to follow.

7. Strengthen type safety.
   - Add or tighten types where ambiguity exists.
   - Prefer explicit domain types over broad or nullable-any style typing.
   - Remove unsafe casts where possible and localize unavoidable ones.

8. Comment sparingly and intentionally.
   - Add comments only when explaining rationale, tradeoffs, or invariants.
   - Do not add comments that restate obvious code behavior.

9. Enforce consistency.
   - Align formatting, naming, and patterns with existing project standards.
   - Use modern language/framework best practices already adopted by the codebase.

10. Verify no behavior regressions.

- Run available checks (tests, type-check, lint, build) whenever the project provides them.
- If checks are missing or cannot run, perform focused manual verification against preserved invariants and report exact limits.

11. Produce final output in required format.

- First: concise summary of what changed and why.
- Then: fully refactored code.
- Ensure code is clean, formatted, and free of unrelated edits.

## Decision Rules

- If a change risks behavior shifts, prefer the safer smaller refactor.
- If unsure between two designs, choose the simpler one with lower cognitive load.
- If a module is both large and unstable, refactor in small passes with verification after each pass.
- If naming conflicts with public API expectations, keep public names stable and improve internals.

## Completion Checklist

- External behavior unchanged.
- Files/functions have clear single purposes.
- Dead code removed and duplication reduced.
- Naming is descriptive and consistent.
- Functions are small and readable; nesting reduced.
- Comments explain why, not what.
- Type safety is improved where applicable.
- Output includes concise change rationale followed by full refactored code for all touched files.

## Failure Handling

- If an intended refactor appears behavior-changing, do not apply it; choose a smaller safe alternative and document the tradeoff.
- If ambiguity remains after reasonable assumptions, proceed with the safest interpretation and state assumptions in the summary.

## Suggested Prompt

"Apply the refactor-agent skill to `src/components/TaskItem.tsx` and `src/hooks/useHoldToDelete.ts`. Preserve behavior and public props. Prioritize deduplication, naming clarity, and type safety. Return a brief change summary followed by full refactored code."
