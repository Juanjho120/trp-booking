# 124 — Pre-Phase-12 Package C Admin Cron Console

## Implementation status

```text
Track: Pre-Phase-12 Improvement Track
Package: C — Admin cron console and generic execution history
Status: Completed and accepted
Accepted head: `5a039aa451628e8ac9712c166bdd0a4605c8813f`

Implementation base: 795a95fec81bc7ff3f177304f2df3df35c4d59e6
Prepared on: 2026-08-06
Current phase: No active implementation phase
Phase 11: Completed and accepted
Phase 12: Not started and not activated
```

## Purpose

Package C adds a protected operational console for the four existing Vercel cron jobs and a generic durable execution history shared by scheduled and manual runs. It does not activate Phase 12, replace specialized domain logs, modify cron schedules, or expose `CRON_SECRET` to the browser.

## Covered jobs

```text
sync-airbnb-calendars
expire-pending-reservation-holds
process-email-notifications
schedule-arrival-instructions
```

The schedules remain the values already registered in `vercel.json`:

```text
sync-airbnb-calendars                  */30 * * * *
expire-pending-reservation-holds       */5 * * * *
process-email-notifications            */5 * * * *
schedule-arrival-instructions          */30 * * * *
```

## Shared instrumented runner

Scheduled routes and the protected admin endpoint now resolve the same typed registry and execute the same runner.

```text
Scheduled request:
Vercel -> /api/cron/<job> -> CRON_SECRET validation -> shared runner

Manual request:
Admin browser -> protected admin API -> session authorization -> shared runner
```

The browser never calls `/api/cron/*`, never receives `CRON_SECRET`, and never submits provider credentials.

## Generic execution history

The new `CronJobExecution` record stores:

```text
job key
trigger source: SCHEDULED or MANUAL
admin actor for manual execution
TRP business environment
status: RUNNING, SUCCESS, PARTIAL_SUCCESS, or FAILED
started and finished timestamps
duration in milliseconds
normalized result JSON
safe error code and message
creation timestamp
```

The normalized JSON is built by the server-owned registry. Airbnb results retain identifiers, status, safe codes, and numeric counters while excluding private iCal URLs and raw provider messages. Email and hold jobs expose only their existing safe aggregate summaries.

## Overlap and abandoned-run handling

PostgreSQL enforces one `RUNNING` execution per job through a partial unique index. Different jobs may run concurrently.

Before a new run is claimed, a `RUNNING` record older than 30 minutes is recovered as `FAILED` with the safe code:

```text
CRON_JOB_STALE_EXECUTION_RECOVERED
```

A concurrent attempt for the same job receives a safe conflict and does not start the business operation a second time.

## Admin console

The protected route is:

```text
/admin/cron-jobs
```

It provides:

```text
- one card for each registered job
- current cron expression
- latest execution status, timestamp, and duration
- disabled run action while a current execution is active
- styled confirmation Sheet for manual execution
- localized success, partial-success, failure, and overlap feedback
- paginated execution history
- expandable normalized JSON result
- manual actor, environment, timestamps, duration, and safe diagnostics
```

All visible copy is bilingual and centralized in `messages/es.ts` and `messages/en.ts`. No native `alert()`, `confirm()`, or `prompt()` is introduced.

## Specialized logs preserved

`sync-airbnb-calendars` continues creating its existing `CalendarSyncLog` records through `syncConfiguredAirbnbIcalImports`. `CronJobExecution` complements that specialized evidence and does not replace, rewrite, or delete it.

## Persistence and migration impact

```text
Prisma schema change: Yes
Migration: 20260806124500_add_cron_job_execution_history
Seed change: No
New dependency: No
Environment-variable change: No
Cron schedule change: No
```

The migration adds three enums, the `cron_job_executions` table, indexes, the admin actor relation, and the partial unique index that protects same-job overlap.

## Preserved contracts

```text
- CRON_SECRET remains server-side and required by scheduled HTTP routes.
- Manual runs require an authorized admin session.
- Scheduled and manual runs execute identical business services.
- Reservation, payment, refund, email, availability, and lifecycle rules remain unchanged.
- Airbnb CalendarSyncLog remains intact.
- No operational record is hard-deleted.
- Raw exceptions, credentials, tokens, private iCal URLs, and provider payloads are not persisted or displayed.
- Phase 12 remains Not started.
- Package D remains deferred.
```

## Required acceptance matrix

### Migration and registry

1. Run Prisma generation, validation, migration, and migration-status checks.
2. Verify all four `CronJobKey` values and schedules match `vercel.json`.
3. Verify no new environment variable or dependency is required.

### Scheduled execution

4. Invoke each `/api/cron/*` route with a valid secret and verify a generic history row is created.
5. Invoke each route without or with an invalid secret and verify no execution row is created.
6. Verify existing response status behavior: success `200`, partial `207`, unavailable/failure `503`.
7. Verify Airbnb still creates its specialized `CalendarSyncLog`.

### Manual execution

8. Open `/admin/cron-jobs` in ES and EN.
9. Verify all four job cards, schedules, and latest summaries.
10. Cancel the confirmation Sheet and verify no execution is created.
11. Execute each job manually and verify `triggerSource=MANUAL` and the admin actor relation.
12. Verify the browser calls only the protected admin API and never `/api/cron/*`.
13. Verify successful, partial, and failed executions show localized feedback and preserve their durable result.

### Concurrency and recovery

14. Start two concurrent requests for the same job and verify only one business execution starts.
15. Start different jobs concurrently and verify both may proceed.
16. Create or simulate a `RUNNING` record older than 30 minutes and verify safe recovery before the next run.
17. Verify a current `RUNNING` execution disables its admin action and a server-side conflict still protects direct API repetition.

### History and safety

18. Verify newest-first server pagination.
19. Expand results and confirm normalized JSON excludes secrets, credentials, private iCal URLs, and raw exceptions.
20. Verify actor, environment, status, timestamps, duration, safe code, and safe message.
21. Verify mobile layout, keyboard navigation, focus behavior, Sheet accessibility, and snackbar dismissal.
22. Run lint, build, `git diff --check`, and repository-status validation.

## Acceptance boundary

Package C was reported working and accepted at `5a039aa451628e8ac9712c166bdd0a4605c8813f`. This accepted boundary includes scheduled and manual execution history, same-job overlap protection, stale-run recovery, bilingual administration, pagination, normalized safe JSON, and the responsive status-badge alignment correction.

Package E may proceed from that accepted head. Phase 12 remains inactive.
