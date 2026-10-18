CREATE TABLE `registration_rate_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `registration_rate_limits_expiry_idx` ON `registration_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `registrations` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_hash` text NOT NULL,
	`event` text DEFAULT 'rovx-bhaderwah-26' NOT NULL,
	`status` text DEFAULT 'application_received' NOT NULL,
	`full_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`city` text NOT NULL,
	`vehicle_make` text NOT NULL,
	`vehicle_model` text NOT NULL,
	`vehicle_year` integer NOT NULL,
	`drive_type` text NOT NULL,
	`experience` text NOT NULL,
	`team_name` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`consent` integer NOT NULL,
	`consent_version` text DEFAULT '2026-10-15' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_idempotency_idx` ON `registrations` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `registrations_reference_idx` ON `registrations` (`reference`);--> statement-breakpoint
CREATE INDEX `registrations_created_at_idx` ON `registrations` (`created_at`);