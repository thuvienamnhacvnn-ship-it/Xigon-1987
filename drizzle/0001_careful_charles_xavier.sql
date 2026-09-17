CREATE TABLE "channel_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" varchar(16) NOT NULL,
	"external_event_id" varchar(120),
	"kind" varchar(40) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature_ok" boolean DEFAULT false NOT NULL,
	"result" text,
	"reservation_id" integer,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "staff_note" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "channel" varchar(16) DEFAULT 'direct' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "external_id" varchar(120);--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "external_payload" jsonb;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "conflict" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "channel_events" ADD CONSTRAINT "channel_events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "channel_events_recent_idx" ON "channel_events" USING btree ("channel","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "channel_events_external_key" ON "channel_events" USING btree ("channel","external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_external_key" ON "reservations" USING btree ("channel","external_id");