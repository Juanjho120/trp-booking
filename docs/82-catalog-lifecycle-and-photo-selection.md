# 82 — Catalog Lifecycle and Photo Selection Follow-up

## Status

```text
Phase: 9.11 — Admin MVP and Brand Identity Completion
Follow-up: Catalog lifecycle and selected-photo cleanup
Status: Pending local validation and commit
Base commit: ac4c8d96dbe1a80e481ebbc9046a3bf887a22a6e
Next subphase after acceptance: 9.11.5 — Reservation and payment detail views
```

## Goal

Close the final accepted observations for Phase 9.11.4:

```text
Create amenities and house rules from the shared Catalogs module
Soft-delete amenities and house rules safely
Clear a selected local property photo before upload
```

## Catalog creation

New catalog rows are created through `POST /api/admin/catalogs`.

Amenity creation requires bilingual names and one approved icon. House-rule creation requires bilingual titles and descriptions. New entries start without property assignments.

The server generates the immutable technical key from the English label and resolves key collisions with a numeric suffix.

## Catalog deletion

Deletion uses `DELETE /api/admin/catalogs` and is logical, not physical.

The service removes replaceable membership rows and stores `deletedAt` and `deletedById` in one serializable transaction. It rejects the operation when any affected accommodation would lose its final active amenity or final active house rule.

## Audit actions

```text
AMENITY_CREATED
AMENITY_SOFT_DELETED
HOUSE_RULE_CREATED
HOUSE_RULE_SOFT_DELETED
```

Existing update and assignment audit actions remain unchanged.

## Photo selection cleanup

The photo upload form displays a clear-selection button whenever a local file is selected. The action:

```text
Clears selectedFile
Resets the hidden input value
Triggers object-URL cleanup
Removes the preview
Keeps bilingual alternative-text drafts
Does not call Cloudinary or the backend
```

## Boundaries

```text
No Prisma migration
No hard deletion
No restore or purge UI
No new dependency
No reservation/payment behavior
No email delivery
No PMS behavior
```
