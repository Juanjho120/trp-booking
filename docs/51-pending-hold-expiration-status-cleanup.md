# 51 — Pending hold expiration status cleanup

## Status

In progress as part of Phase 8.5.1.

## Purpose

This subphase adds the small operational cleanup step needed after Phase 8.4 and Phase 8.5.

The availability service already ignores expired pending holds when `status = PENDING_PAYMENT` and `expiresAt <= now`, so expired holds stop blocking dates even before this cleanup runs. This subphase makes the database state clearer by moving those records to `EXPIRED`.

## Cron endpoint

```txt
GET /api/cron/expire-pending-reservation-holds
```

## Security

The route uses the same cron security pattern already used by the Airbnb iCal cron route:

```txt
Authorization: Bearer <CRON_SECRET>
```

or:

```txt
x-cron-secret: <CRON_SECRET>
```

If `CRON_SECRET` is not configured, the route returns `503`.

If the request does not provide the expected secret, the route returns `401`.

## Scheduled execution

`vercel.json` registers the route every 5 minutes:

```json
{
  "path": "/api/cron/expire-pending-reservation-holds",
  "schedule": "*/5 * * * *"
}
```

The cron frequency does not control availability release. Availability is released as soon as `expiresAt <= now` because the availability service ignores expired pending holds. The cron only updates persisted status from `PENDING_PAYMENT` to `EXPIRED`.

## Cleanup rule

The cleanup updates reservations that match:

```text
status = PENDING_PAYMENT
expiresAt <= now
```

The cleanup sets:

```text
status = EXPIRED
```

It does not hard-delete reservations and does not modify paid, confirmed, cancelled, refunded, blocked, or already expired reservations.

## Response

Successful response:

```ts
{
  expiredCount: number;
  expiredAt: string;
}
```

## Out of scope

This subphase intentionally does not add:

- Tilopay checkout.
- Payment records.
- Payment webhooks.
- Reservation confirmation.
- Resend emails.
- Calendar blocks.
- Admin reservation UI.
- PMS behavior.
- New Prisma schema fields.
- New migrations.

## Files added or updated

```txt
app/api/cron/expire-pending-reservation-holds/route.ts
lib/reservations/expiration.ts
lib/reservations/index.ts
vercel.json
README.md
docs/10-phases.md
docs/11-progress-log.md
docs/51-pending-hold-expiration-status-cleanup.md
```

## Validation checklist

Run:

```bash
npm run lint
npm run build
```

Manual database setup for a local/staging test:

```sql
update trp_booking.reservations
set expires_at = now() - interval '1 minute'
where id = '<pending_reservation_id>'
  and status = 'PENDING_PAYMENT';
```

Manual endpoint call:

```bash
curl -X GET http://localhost:3000/api/cron/expire-pending-reservation-holds \
  -H "authorization: Bearer $CRON_SECRET"
```

Expected response:

```txt
HTTP 200
expiredCount >= 1
```

Database verification:

```sql
select id, status, expires_at
from trp_booking.reservations
where id = '<pending_reservation_id>';
```

Expected result:

```text
status = EXPIRED
expires_at remains unchanged
```

Safety checks:

```sql
select *
from trp_booking.payments
order by created_at desc
limit 5;

select *
from trp_booking.email_notifications
order by created_at desc
limit 5;

select *
from trp_booking.calendar_blocks
order by created_at desc
limit 5;
```

The cron route must not create records in `payments`, `email_notifications`, or `calendar_blocks`.
