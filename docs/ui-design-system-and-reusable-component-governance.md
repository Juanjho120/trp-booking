# UI Design System & Reusable Component Governance — TRP Booking

**Status:** Owner-approved UI collaboration and component-governance guidance
**Adopted:** 2026-10-13
**Scope:** Public and Admin user interfaces in TRP Booking

## Sources of authority

- `AGENTS.md` remains the primary repository collaboration and technical-rule source.
- This document describes reusable UI design/component decisions without changing accepted phase or subphase contracts.
- [Owner UX Review Workflow](./owner-ux-visual-prototyping-workflow.md) defines visual proposal → interactive simulation when useful → Codex implementation → Hosted owner validation.

## Approved UI foundation

- Next.js and React with Tailwind CSS, shadcn/ui and Radix UI, following the existing codebase.
- Use styled accessible primitives, not unstyled native dialogs, alerts, date pickers or browser confirmation prompts where the project already defines UI components.
- Keep labels, messages and other visible text centralized in `messages/es.ts` and `messages/en.ts`.
- Respect semantics, keyboard behavior, focus states, reduced motion, responsive layout and existing public/Admin design distinctions.

## Component reuse and consistency

1. Inspect existing shared components and accepted patterns before designing a new button, tab, table, alert, modal, skeleton or navigation element.
2. Reuse the shared component by default so a common design or behavioral change can be made centrally rather than duplicated across pages.
3. When a page needs a justified difference, add a typed opt-in prop/variant/configuration where practical. Keep the existing default behavior unchanged for other consumers.
4. Significant exceptions to the chosen shared design require an explicit owner decision; do not silently fork styles or change the project's visual language.
5. Avoid oversized components: separate shared presentation, reusable state coordination and domain/business rules appropriately.
6. Preserve current page behavior and contracts, especially authorization, i18n, validation, mutation handling and server-authoritative data.

Existing examples include `components/ui/*`, `features/admin/components/admin-page-header.tsx`, `admin-link-tabs.tsx`, `admin-contextual-help.tsx`, `admin-navigation-feedback.tsx` and `admin-loading-skeletons.tsx`. Examples do not require all UI surfaces to depend on these exact components.

## Loading, navigation and UI states

- Prefer immediate, honest feedback for a user-initiated navigation or state change.
- Distinguish local tabs (no new server request) from URL-driven pages or tabs that load server data.
- Where appropriate, render destination-shaped skeletons and keep pending, empty, error and disabled states legible and accessible.
- Do not falsely display data from the prior screen as if it belonged to the requested destination.
- Never add artificial loading delays, persistent caches or speculative requests merely to simulate performance.
- Preserve authoritative server checks and avoid changing business rules for cosmetic feedback.

## Owner visual-review workflow

The four stages are documented in [Owner UX Review Workflow](./owner-ux-visual-prototyping-workflow.md):

1. **Visual proposal:** demonstrate the proposed appearance and UX hierarchy.
2. **Interactive simulation (when useful):** let the owner try controls and representative skeleton/transition states within the conversation.
3. **Codex implementation:** produce bounded specifications adapted to the TRP stack and the component governance above.
4. **Hosted validation:** verify the actual implementation against the agreed behavior, preserve test/deployment evidence and obtain explicit owner acceptance.

The conversation prototype is illustrative only. Automated tests, actual deployment and owner acceptance remain separate steps. Do not demand a prototype for a purely technical task where none adds decision value.

## Approval and phase boundary

- This policy is a documentation-only process standard, independent of Final-I.6.10 implementation and its pending Hosted acceptance.
- No prior accepted phase is reopened by adopting this guidance.
- Final-I.7 remains blocked pending official INFILE technical documentation and Test credentials; Final-I.8/I.9 remain not started; Phase 13 remains blocked.
- Only the owner formally accepts a feature; a docs-only policy commit is not a feature HEAD or an acceptance decision.
