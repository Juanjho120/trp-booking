# Owner UX Review Workflow — Visual Proposal, Interactive Prototype, Codex and Hosted Validation

**Status:** Owner-approved collaboration standard
**Adopted in TRP Booking:** 2026-10-13
**Scope:** Present and future UI/UX work where a visual explanation or prototype adds value.
**Technology:** Framework-independent method; the TRP implementation follows Next.js, React, Tailwind CSS, shadcn/ui and Radix UI.

## Guiding principle

For UI changes that benefit from visual discussion, present the proposed appearance and behavior before implementation. When useful and supported, supply an interactive prototype inside the conversation so the owner can explore tabs, buttons, forms, loading skeletons, navigation and relevant states.

**A conversational prototype is a simulation.** It is not a screenshot of the deployed TRP app, does not read or mutate production data, and cannot establish backend correctness, exact browser geometry, network performance, or security.

## The four stages

### 1. Visual proposal

- Explain the UX problem and the intended behavior, using a legible mockup when useful.
- Show layout, hierarchy, spacing, titles, shared components, tabs, forms, actions and visual states relevant to the decision.
- Reuse the approved TRP Design System; identify desktop, mobile and Android PWA considerations when applicable.
- Keep proposals scoped to the request and avoid decorative prototypes that do not help the owner make a decision.

### 2. Interactive simulation

- When it adds value, create a small interactive demonstration within the conversation.
- Allow the owner to try selection changes, tabs, button states, accordion behavior, feedback, skeletons and conceptual loading transitions.
- Represent useful empty, loading, success, error and disabled states; include reduced-motion and accessibility considerations.
- For asynchronous navigation, consider immediate visual feedback, safe optimistic selection and bounded duplicate-action prevention.
- Clearly distinguish illustrative content and states from live data or tested application behavior.
- Invite owner refinements before turning the design into implementation instructions when appropriate.

### 3. Implementation with Codex or an equivalent development agent

- Turn the agreed behavior into concrete, testable and bounded implementation instructions.
- Adapt to the actual repository, its components, i18n files, route model, data lifecycles, tests and existing architecture.
- In TRP Booking use Next.js/React and the approved shadcn/ui + Radix UI + Tailwind foundations; never impose this framework on another project.
- Prefer shared components and opt-in configurable variants rather than duplicating UX patterns across pages.
- Preserve security, authorization, server-side availability, payments, privacy, audit requirements and previously accepted contracts.
- Include deterministic regressions and realistic Hosted acceptance criteria; avoid speculative refactors and phase advancement.

### 4. Hosted validation and owner acceptance

- Inspect the pushed commit, changed files, validation evidence, and actual deployment state.
- State which checks were independently verified versus merely reported by Codex.
- Compare the implemented UI against the proposed behavior on relevant screen sizes and devices.
- Check accessibility, pending/disabled/error states, navigation, duplicate requests, responsive layout and functional preservation.
- Apply narrowly scoped corrective iterations where necessary.
- Only the owner can grant formal acceptance. Preserve accepted feature HEAD separately from any documentation-only closure commit.

## Framework independence and other repositories

This is the owner-wide collaboration method. Hefestus ERP should implement agreed designs with its Angular architecture; Century Parts should use its actual MedusaJS/frontend architecture; future repositories must inspect their chosen technology rather than copying TRP-specific code. Interactive examples in ChatGPT do not prescribe implementation libraries.

## When to use a prototype

Recommended for UI layout decisions, navigation and tabs, tables, forms, calendars, skeletons, async transitions, responsive design and major interaction changes. A prototype is optional and should not delay straightforward bugfixes or purely backend, SQL, security, infrastructure and documentation tasks.

## Repository governance

- Read `AGENTS.md` and `docs/ui-design-system-and-reusable-component-governance.md` before significant UI work.
- This workflow is a collaboration protocol, not a replacement for the project's technical, testing, security or acceptance rules.
- Future modifications to the workflow should be documented explicitly and must not rewrite prior acceptance evidence.
- This repository copy adapts the owner's transversal standard maintained separately in their ChatGPT Library (`/Project-Governance/visual-ui-prototyping-workflow.md`). This repository file is independently readable by Codex and does not require access to that Library.
