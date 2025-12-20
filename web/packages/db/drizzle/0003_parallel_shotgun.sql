ALTER TABLE "recordings" ADD COLUMN "transcript" jsonb;--> statement-breakpoint
ALTER TABLE "recordings" DROP COLUMN "cleaned_transcript";