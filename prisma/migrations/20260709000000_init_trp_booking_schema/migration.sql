-- TRP Booking clean initial migration.
-- PostgreSQL identifiers are snake_case from the first migration.
-- Prisma model/field names remain camelCase through @map in prisma/schema.prisma.

-- Enums
CREATE TYPE user_role AS ENUM ('ADMIN');
CREATE TYPE property_status AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
CREATE TYPE reservation_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'EXPIRED', 'BLOCKED');
CREATE TYPE payment_provider AS ENUM ('TILOPAY');
CREATE TYPE payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE refund_status AS ENUM ('PENDING', 'APPROVED', 'FAILED', 'MANUAL');
CREATE TYPE calendar_block_source AS ENUM ('DIRECT_RESERVATION', 'AIRBNB', 'MANUAL_BLOCK', 'MAINTENANCE', 'COMPOSED_LISTING_DEPENDENCY', 'PREPARATION_BUFFER');
CREATE TYPE external_calendar_provider AS ENUM ('AIRBNB');
CREATE TYPE external_calendar_status AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');
CREATE TYPE external_calendar_direction AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');
CREATE TYPE external_calendar_event_status AS ENUM ('ACTIVE', 'REMOVED', 'CANCELLED');
CREATE TYPE calendar_sync_triggered_by AS ENUM ('CRON', 'ADMIN', 'SYSTEM');
CREATE TYPE calendar_sync_status AS ENUM ('STARTED', 'SUCCESS', 'FAILED', 'PARTIAL_SUCCESS');
CREATE TYPE email_notification_type AS ENUM ('RESERVATION_CONFIRMED', 'PAYMENT_APPROVED', 'PAYMENT_FAILED', 'RESERVATION_CANCELLED', 'RESERVATION_DATES_UPDATED', 'STAY_EXTENSION_CONFIRMED', 'REFUND_PROCESSED', 'ARRIVAL_INSTRUCTIONS', 'ADMIN_NEW_RESERVATION');
CREATE TYPE email_notification_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- Tables
CREATE TABLE users (
    id TEXT NOT NULL,
    name TEXT,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE properties (
    id TEXT NOT NULL,
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL,
    short_description_es TEXT NOT NULL,
    short_description_en TEXT NOT NULL,
    long_description_es TEXT NOT NULL,
    long_description_en TEXT NOT NULL,
    max_guests INTEGER NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms INTEGER NOT NULL,
    base_nightly_price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status property_status NOT NULL DEFAULT 'DRAFT',
    check_in_time TEXT NOT NULL,
    check_out_time TEXT,
    is_composed BOOLEAN NOT NULL DEFAULT false,
    preparation_days_before INTEGER NOT NULL DEFAULT 0,
    preparation_days_after INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT properties_pkey PRIMARY KEY (id)
);

CREATE TABLE property_components (
    id TEXT NOT NULL,
    parent_property_id TEXT NOT NULL,
    component_property_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT property_components_pkey PRIMARY KEY (id)
);

CREATE TABLE property_images (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    cloudinary_public_id TEXT,
    url TEXT NOT NULL,
    secure_url TEXT,
    alt_text_es TEXT NOT NULL,
    alt_text_en TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT property_images_pkey PRIMARY KEY (id)
);

CREATE TABLE amenities (
    id TEXT NOT NULL,
    key TEXT NOT NULL,
    name_es TEXT NOT NULL,
    name_en TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT amenities_pkey PRIMARY KEY (id)
);

CREATE TABLE property_amenities (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    amenity_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT property_amenities_pkey PRIMARY KEY (id)
);

CREATE TABLE house_rules (
    id TEXT NOT NULL,
    key TEXT NOT NULL,
    title_es TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_es TEXT NOT NULL,
    description_en TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT house_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE property_rules (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT property_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE reservations (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    guest_country TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    arrival_time_estimate TEXT,
    guest_count INTEGER NOT NULL,
    status reservation_status NOT NULL DEFAULT 'PENDING_PAYMENT',
    subtotal DECIMAL(10,2) NOT NULL,
    cleaning_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    taxes DECIMAL(10,2) NOT NULL DEFAULT 0,
    discounts DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    expires_at TIMESTAMP(3),
    confirmed_at TIMESTAMP(3),
    cancelled_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT reservations_pkey PRIMARY KEY (id)
);

CREATE TABLE reservation_guests (
    id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT reservation_guests_pkey PRIMARY KEY (id)
);

CREATE TABLE payments (
    id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    provider payment_provider NOT NULL DEFAULT 'TILOPAY',
    provider_transaction_id TEXT,
    provider_reference TEXT,
    status payment_status NOT NULL DEFAULT 'PENDING',
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    paid_at TIMESTAMP(3),
    failed_at TIMESTAMP(3),
    raw_payload JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE refunds (
    id TEXT NOT NULL,
    payment_id TEXT NOT NULL,
    provider_refund_id TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    reason TEXT,
    status refund_status NOT NULL DEFAULT 'PENDING',
    raw_payload JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT refunds_pkey PRIMARY KEY (id)
);

CREATE TABLE calendar_blocks (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    source calendar_block_source NOT NULL,
    reason TEXT,
    reservation_id TEXT,
    external_calendar_event_id TEXT,
    parent_block_id TEXT,
    is_admin_override_allowed BOOLEAN NOT NULL DEFAULT false,
    unlocked_by_admin_at TIMESTAMP(3),
    unlocked_by_admin_id TEXT,
    admin_override_reason TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT calendar_blocks_pkey PRIMARY KEY (id)
);

CREATE TABLE external_calendars (
    id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    provider external_calendar_provider NOT NULL DEFAULT 'AIRBNB',
    direction external_calendar_direction NOT NULL DEFAULT 'BIDIRECTIONAL',
    name TEXT NOT NULL,
    import_url_encrypted TEXT,
    export_token_hash TEXT,
    export_token_last_rotated_at TIMESTAMP(3),
    is_import_enabled BOOLEAN NOT NULL DEFAULT true,
    is_export_enabled BOOLEAN NOT NULL DEFAULT true,
    last_import_started_at TIMESTAMP(3),
    last_import_finished_at TIMESTAMP(3),
    last_export_generated_at TIMESTAMP(3),
    last_failure_code TEXT,
    last_failure_message TEXT,
    status external_calendar_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    deleted_at TIMESTAMP(3),
    deleted_by_id TEXT,
    CONSTRAINT external_calendars_pkey PRIMARY KEY (id)
);

CREATE TABLE external_calendar_events (
    id TEXT NOT NULL,
    external_calendar_id TEXT NOT NULL,
    provider_event_uid TEXT NOT NULL,
    status external_calendar_event_status NOT NULL DEFAULT 'ACTIVE',
    summary TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    first_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    removed_at TIMESTAMP(3),
    raw_payload JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT external_calendar_events_pkey PRIMARY KEY (id)
);

CREATE TABLE external_calendar_sync_logs (
    id TEXT NOT NULL,
    external_calendar_id TEXT NOT NULL,
    triggered_by calendar_sync_triggered_by NOT NULL,
    status calendar_sync_status NOT NULL DEFAULT 'STARTED',
    started_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP(3),
    events_imported INTEGER NOT NULL DEFAULT 0,
    events_updated INTEGER NOT NULL DEFAULT 0,
    events_removed INTEGER NOT NULL DEFAULT 0,
    events_skipped INTEGER NOT NULL DEFAULT 0,
    blocks_created INTEGER NOT NULL DEFAULT 0,
    blocks_updated INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT external_calendar_sync_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE email_notifications (
    id TEXT NOT NULL,
    reservation_id TEXT NOT NULL,
    type email_notification_type NOT NULL,
    recipient TEXT NOT NULL,
    locale TEXT NOT NULL,
    status email_notification_status NOT NULL DEFAULT 'PENDING',
    provider_message_id TEXT,
    sent_at TIMESTAMP(3),
    error_message TEXT,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT email_notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE admin_audit_logs (
    id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admin_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE settings (
    id TEXT NOT NULL,
    key TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT settings_pkey PRIMARY KEY (id)
);

-- Unique constraints
CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE UNIQUE INDEX properties_slug_key ON properties(slug);
CREATE UNIQUE INDEX amenities_key_key ON amenities(key);
CREATE UNIQUE INDEX property_components_parent_property_id_component_property_id_key ON property_components(parent_property_id, component_property_id);
CREATE UNIQUE INDEX property_amenities_property_id_amenity_id_key ON property_amenities(property_id, amenity_id);
CREATE UNIQUE INDEX house_rules_key_key ON house_rules(key);
CREATE UNIQUE INDEX property_rules_property_id_rule_id_key ON property_rules(property_id, rule_id);
CREATE UNIQUE INDEX external_calendars_export_token_hash_key ON external_calendars(export_token_hash);
CREATE UNIQUE INDEX external_calendar_events_external_calendar_id_provider_event_uid_key ON external_calendar_events(external_calendar_id, provider_event_uid);
CREATE UNIQUE INDEX settings_key_key ON settings(key);

-- Indexes
CREATE INDEX properties_status_idx ON properties(status);
CREATE INDEX properties_deleted_at_idx ON properties(deleted_at);
CREATE INDEX property_components_component_property_id_idx ON property_components(component_property_id);
CREATE INDEX property_images_property_id_sort_order_idx ON property_images(property_id, sort_order);
CREATE INDEX property_images_deleted_at_idx ON property_images(deleted_at);
CREATE INDEX amenities_deleted_at_idx ON amenities(deleted_at);
CREATE INDEX property_amenities_amenity_id_idx ON property_amenities(amenity_id);
CREATE INDEX house_rules_deleted_at_idx ON house_rules(deleted_at);
CREATE INDEX property_rules_rule_id_idx ON property_rules(rule_id);
CREATE INDEX reservations_property_id_check_in_date_check_out_date_idx ON reservations(property_id, check_in_date, check_out_date);
CREATE INDEX reservations_status_idx ON reservations(status);
CREATE INDEX reservations_guest_email_idx ON reservations(guest_email);
CREATE INDEX reservation_guests_reservation_id_idx ON reservation_guests(reservation_id);
CREATE INDEX payments_reservation_id_idx ON payments(reservation_id);
CREATE INDEX payments_provider_provider_reference_idx ON payments(provider, provider_reference);
CREATE INDEX payments_status_idx ON payments(status);
CREATE INDEX refunds_payment_id_idx ON refunds(payment_id);
CREATE INDEX refunds_status_idx ON refunds(status);
CREATE INDEX calendar_blocks_property_id_start_date_end_date_idx ON calendar_blocks(property_id, start_date, end_date);
CREATE INDEX calendar_blocks_source_idx ON calendar_blocks(source);
CREATE INDEX calendar_blocks_reservation_id_idx ON calendar_blocks(reservation_id);
CREATE INDEX calendar_blocks_external_calendar_event_id_idx ON calendar_blocks(external_calendar_event_id);
CREATE INDEX calendar_blocks_deleted_at_idx ON calendar_blocks(deleted_at);
CREATE INDEX external_calendars_property_id_idx ON external_calendars(property_id);
CREATE INDEX external_calendars_provider_status_idx ON external_calendars(provider, status);
CREATE INDEX external_calendars_direction_idx ON external_calendars(direction);
CREATE INDEX external_calendars_deleted_at_idx ON external_calendars(deleted_at);
CREATE INDEX external_calendar_events_external_calendar_id_start_date_end_date_idx ON external_calendar_events(external_calendar_id, start_date, end_date);
CREATE INDEX external_calendar_events_status_idx ON external_calendar_events(status);
CREATE INDEX external_calendar_sync_logs_external_calendar_id_idx ON external_calendar_sync_logs(external_calendar_id);
CREATE INDEX external_calendar_sync_logs_status_idx ON external_calendar_sync_logs(status);
CREATE INDEX external_calendar_sync_logs_started_at_idx ON external_calendar_sync_logs(started_at);
CREATE INDEX email_notifications_reservation_id_idx ON email_notifications(reservation_id);
CREATE INDEX email_notifications_status_idx ON email_notifications(status);
CREATE INDEX email_notifications_type_idx ON email_notifications(type);
CREATE INDEX admin_audit_logs_user_id_idx ON admin_audit_logs(user_id);
CREATE INDEX admin_audit_logs_entity_type_entity_id_idx ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX admin_audit_logs_created_at_idx ON admin_audit_logs(created_at);

-- Foreign keys
ALTER TABLE properties ADD CONSTRAINT properties_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE property_components ADD CONSTRAINT property_components_parent_property_id_fkey FOREIGN KEY (parent_property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE property_components ADD CONSTRAINT property_components_component_property_id_fkey FOREIGN KEY (component_property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE property_images ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE property_images ADD CONSTRAINT property_images_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE amenities ADD CONSTRAINT amenities_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE property_amenities ADD CONSTRAINT property_amenities_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE property_amenities ADD CONSTRAINT property_amenities_amenity_id_fkey FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE house_rules ADD CONSTRAINT house_rules_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE property_rules ADD CONSTRAINT property_rules_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE property_rules ADD CONSTRAINT property_rules_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES house_rules(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reservations ADD CONSTRAINT reservations_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE reservation_guests ADD CONSTRAINT reservation_guests_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE refunds ADD CONSTRAINT refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_external_calendar_event_id_fkey FOREIGN KEY (external_calendar_event_id) REFERENCES external_calendar_events(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_parent_block_id_fkey FOREIGN KEY (parent_block_id) REFERENCES calendar_blocks(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_unlocked_by_admin_id_fkey FOREIGN KEY (unlocked_by_admin_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE calendar_blocks ADD CONSTRAINT calendar_blocks_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE external_calendars ADD CONSTRAINT external_calendars_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE external_calendars ADD CONSTRAINT external_calendars_deleted_by_id_fkey FOREIGN KEY (deleted_by_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE external_calendar_events ADD CONSTRAINT external_calendar_events_external_calendar_id_fkey FOREIGN KEY (external_calendar_id) REFERENCES external_calendars(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE external_calendar_sync_logs ADD CONSTRAINT external_calendar_sync_logs_external_calendar_id_fkey FOREIGN KEY (external_calendar_id) REFERENCES external_calendars(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE email_notifications ADD CONSTRAINT email_notifications_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE admin_audit_logs ADD CONSTRAINT admin_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;
