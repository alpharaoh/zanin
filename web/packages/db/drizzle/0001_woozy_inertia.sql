CREATE TABLE "recordings" (
	"id" text PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	"deleted_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"finished_at" timestamp with time zone,
	"processing_error" text,
	"title" text,
	"raw_audio_url" text NOT NULL,
	"cleaned_audio_url" text,
	"confidence" real,
	"original_duration" real,
	"cleaned_transcript" text,
	"words" jsonb,
	"vad_segments" jsonb,
	"metadata" jsonb,
	CONSTRAINT "recordings_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;