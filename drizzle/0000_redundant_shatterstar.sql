CREATE TABLE "cart_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"cart_id" integer NOT NULL,
	"dish_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"quantity" smallint DEFAULT 1 NOT NULL,
	"note" text,
	"added_price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(80) NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text,
	"name_vi" text,
	"note_de" text,
	"note_en" text,
	"note_vi" text,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dish_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"dish_id" integer NOT NULL,
	"label_de" text NOT NULL,
	"label_en" text,
	"label_vi" text,
	"price_cents" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"orderable" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dishes" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"slug" varchar(120) NOT NULL,
	"code" varchar(12),
	"sort" integer DEFAULT 0 NOT NULL,
	"name_de" text NOT NULL,
	"name_en" text,
	"name_vi" text,
	"description_de" text,
	"description_en" text,
	"description_vi" text,
	"ingredients_de" text,
	"ingredients_en" text,
	"ingredients_vi" text,
	"plate_id" varchar(60),
	"scene_id" varchar(60),
	"vegetarian" boolean DEFAULT false NOT NULL,
	"vegan" boolean DEFAULT false NOT NULL,
	"spice" smallint DEFAULT 0 NOT NULL,
	"allergens" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"allergens_confirmed" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"sold_out" boolean DEFAULT false NOT NULL,
	"price_confirmed" boolean DEFAULT false NOT NULL,
	"source_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"dish_id" integer,
	"variant_id" integer,
	"name_snapshot" text NOT NULL,
	"variant_snapshot" text,
	"quantity" smallint NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"reference" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'awaiting_payment' NOT NULL,
	"fulfilment" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"street" text,
	"postal_code" varchar(10),
	"city" text,
	"address_note" text,
	"locale" varchar(2) DEFAULT 'de' NOT NULL,
	"slot_date" varchar(10) NOT NULL,
	"slot_minute" integer NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"tax_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_provider" varchar(24),
	"payment_reference" text,
	"paid_at" timestamp with time zone,
	"idempotency_key" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(120) NOT NULL,
	"title_de" text NOT NULL,
	"title_en" text,
	"title_vi" text,
	"body_de" text,
	"body_en" text,
	"body_vi" text,
	"image_path" text,
	"image_width" integer,
	"image_height" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"bucket" varchar(40) NOT NULL,
	"subject" varchar(120) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_bucket_subject_window_start_pk" PRIMARY KEY("bucket","subject","window_start")
);
--> statement-breakpoint
CREATE TABLE "reservation_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"date" varchar(10) NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"party_size" smallint NOT NULL,
	"table_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(64) NOT NULL,
	"reference" varchar(16) NOT NULL,
	"status" varchar(32) DEFAULT 'requested' NOT NULL,
	"date" varchar(10) NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"party_size" smallint NOT NULL,
	"table_id" integer,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"occasion" text,
	"note" text,
	"locale" varchar(2) DEFAULT 'de' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"seats_min" smallint NOT NULL,
	"seats_max" smallint NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"confirmed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"author" text NOT NULL,
	"rating" smallint,
	"body_de" text,
	"body_en" text,
	"body_vi" text,
	"source" text,
	"source_url" text,
	"consent_confirmed" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_dish_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."dish_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dish_variants" ADD CONSTRAINT "dish_variants_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dishes" ADD CONSTRAINT "dishes_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_dish_id_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_dish_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."dish_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_holds" ADD CONSTRAINT "reservation_holds_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_token_key" ON "carts" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_key" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dish_variants_dish_idx" ON "dish_variants" USING btree ("dish_id","sort");--> statement-breakpoint
CREATE UNIQUE INDEX "dishes_slug_key" ON "dishes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dishes_category_idx" ON "dishes" USING btree ("category_id","sort");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_token_key" ON "orders" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_reference_key" ON "orders" USING btree ("reference");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_key" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_slot_idx" ON "orders" USING btree ("slot_date","slot_minute");--> statement-breakpoint
CREATE UNIQUE INDEX "promotions_slug_key" ON "promotions" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "reservation_holds_token_key" ON "reservation_holds" USING btree ("token");--> statement-breakpoint
CREATE INDEX "reservation_holds_day_idx" ON "reservation_holds" USING btree ("date","start_minute");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_token_key" ON "reservations" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_reference_key" ON "reservations" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "reservations_day_idx" ON "reservations" USING btree ("date","start_minute");