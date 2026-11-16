CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`meta_json` text
);
--> statement-breakpoint
CREATE INDEX `audit_log_at_idx` ON `audit_log` (`at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`next_path` text,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_tokens_token_hash_unique` ON `auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_tokens_expires_idx` ON `auth_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `discount_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`value` integer NOT NULL,
	`event_id` text,
	`valid_from` integer,
	`valid_until` integer,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "discount_codes_kind_check" CHECK("discount_codes"."kind" IN ('percent','fixed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discount_codes_code_unique` ON `discount_codes` (`code`);--> statement-breakpoint
CREATE TABLE `event_lecturers` (
	`event_id` text NOT NULL,
	`lecturer_id` text NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`event_id`, `lecturer_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lecturer_id`) REFERENCES `lecturers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`academy` text NOT NULL,
	`format` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`timezone` text DEFAULT 'Europe/Zagreb' NOT NULL,
	`venue_name` text,
	`venue_address` text,
	`city` text,
	`summary` text,
	`description` text,
	`tags` text,
	`cover_key` text,
	`zoom_kind` text,
	`zoom_id` text,
	`akredo_event_id` text,
	`registration_opens_at` integer,
	`registration_closes_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	CONSTRAINT "events_format_check" CHECK("events"."format" IN ('offline','online','hybrid')),
	CONSTRAINT "events_status_check" CHECK("events"."status" IN ('draft','published','cancelled','finished')),
	CONSTRAINT "events_time_check" CHECK("events"."ends_at" > "events"."starts_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);--> statement-breakpoint
CREATE INDEX `events_status_starts_idx` ON `events` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `group_discounts` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text,
	`min_qty` integer NOT NULL,
	`percent_bp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`company` text,
	`phone` text,
	`size` text,
	`academy` text,
	`message` text NOT NULL,
	`handled_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lecturers` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`bio` text,
	`photo_key` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lecturers_slug_unique` ON `lecturers` (`slug`);--> statement-breakpoint
CREATE TABLE `materials` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`title` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`visible_from` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`event_id` text NOT NULL,
	`user_id` text,
	`buyer_type` text NOT NULL,
	`buyer_name` text NOT NULL,
	`buyer_email` text NOT NULL,
	`company_name` text,
	`company_oib` text,
	`company_address` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`discount_code_id` text,
	`subtotal_cents` integer NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`vat_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`expires_at` integer,
	`paid_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`discount_code_id`) REFERENCES `discount_codes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_status_check" CHECK("orders"."status" IN ('pending','awaiting_transfer','paid','cancelled','refunded'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_number_unique` ON `orders` (`number`);--> statement-breakpoint
CREATE INDEX `orders_event_idx` ON `orders` (`event_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`event_id` text NOT NULL,
	`ticket_type_id` text NOT NULL,
	`user_id` text,
	`attendee_name` text NOT NULL,
	`attendee_email` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`price_cents` integer NOT NULL,
	`zoom_registrant_id` text,
	`zoom_join_url` text,
	`akredo_registration_id` text,
	`attended_at` integer,
	`attendance_source` text,
	`certificate_key` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `registrations_event_idx` ON `registrations` (`event_id`,`status`);--> statement-breakpoint
CREATE INDEX `registrations_order_idx` ON `registrations` (`order_id`);--> statement-breakpoint
CREATE INDEX `registrations_email_idx` ON `registrations` (`attendee_email`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_event_email_active_uq` ON `registrations` (`event_id`,`attendee_email`) WHERE status <> 'cancelled';--> statement-breakpoint
CREATE TABLE `sessions` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `ticket_types` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`mode` text NOT NULL,
	`price_cents` integer NOT NULL,
	`early_bird_price_cents` integer,
	`early_bird_until` integer,
	`vat_rate_bp` integer DEFAULT 2500 NOT NULL,
	`kpd_code` text,
	`capacity` integer,
	`is_active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ticket_types_mode_check" CHECK("ticket_types"."mode" IN ('onsite','online')),
	CONSTRAINT "ticket_types_price_check" CHECK("ticket_types"."price_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `ticket_types_event_idx` ON `ticket_types` (`event_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`last_login_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`ticket_type_id` text,
	`name` text,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`notified_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ticket_type_id`) REFERENCES `ticket_types`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_event_email_uq` ON `waitlist` (`event_id`,`email`);