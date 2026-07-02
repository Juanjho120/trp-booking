# 08 — Email Notifications

## Provider

Use Resend for transactional email.

Official sender identities:

```text
reservas@turefugioperfecto.com.gt
reservations@turefugioperfecto.com.gt
admin@turefugioperfecto.com.gt
```

Recommended usage:

```text
Spanish guest emails: reservas@turefugioperfecto.com.gt
English guest emails: reservations@turefugioperfecto.com.gt
Internal admin emails: admin@turefugioperfecto.com.gt
```

## Receiving Replies

Resend handles sending. If guests should reply to these addresses, configure email hosting or forwarding with a provider such as Google Workspace, Zoho Mail, Microsoft 365, or another domain email service.

## Email Events

Initial email events:

```text
Reservation pending payment
Payment approved / reservation confirmed
Payment failed
Reservation cancelled
Reservation dates updated
Stay extension confirmed
Refund processed
Arrival instructions
Admin new reservation notification
Admin payment failed notification
Admin cancellation notification
```

## Reservation Confirmed Email

Send after trusted payment confirmation.

Content:

```text
Guest name
Reservation code
Accommodation name
Check-in date
Check-out date
Guest count
Estimated arrival time provided by the guest
Total paid
Currency
Basic rules
Contact information
```

## Arrival Instructions Email

Send after payment confirmation, either immediately or at a configured time before check-in.

Content:

```text
Exact address
Directions from reference points
Check-in schedule reminder
Estimated arrival time provided by the guest
Special arrival rules
Reference photos or map links
Host contact
```

Important:

Some arrival details should not be public. They should be sent only after confirmed payment.

## Payment Failed Email

Content:

```text
Reservation attempt summary
Payment could not be completed
Dates are not guaranteed until payment is approved
Link to try again if still available
Contact information
```

## Cancellation Email

Content:

```text
Reservation code
Accommodation
Cancelled dates
Refund eligibility summary
Refund amount, if applicable
Processing time note
Contact information
```


## Reservation Dates Updated Email

Send when an admin-approved date change is confirmed.

Content:

```text
Reservation code
Accommodation
Previous dates
Updated dates
Updated total, if applicable
Additional payment or refund summary, if applicable
Contact information
```

## Stay Extension Confirmed Email

Send when a stay extension is approved and payment/recording is completed.

Content:

```text
Reservation code
Accommodation
Original check-out date
New check-out date
Additional nights
Additional amount paid or recorded, if applicable
Updated preparation/check-out reminders
Contact information
```

## Refund Email

Content:

```text
Reservation code
Refund amount
Currency
Refund status
Expected processing note
Contact information
```

## Admin Notification Email

Send to:

```text
admin@turefugioperfecto.com.gt
```

Events:

```text
New confirmed reservation
Payment failed
Reservation cancelled
Refund requested/completed
Reservation date change approved
Stay extension approved
Preparation buffer manually unlocked
Airbnb sync error
```

## Localization

Email templates must support:

```text
Spanish
English
```

Guest email language should come from:

```text
Selected site locale
Guest preference, if captured
Reservation locale
```

## Email Logging

Track each email in `EmailNotification`:

```text
type
recipient
locale
status
providerMessageId
sentAt
errorMessage
```
