-- Add video-specific fields to prompts table
ALTER TABLE "prompts" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "prompts" ADD COLUMN "videoSettings" JSONB;
ALTER TABLE "prompts" ADD COLUMN "templateKey" TEXT;
ALTER TABLE "prompts" ADD COLUMN "variables" JSONB;

-- Add index for type and category filtering
CREATE INDEX "prompts_type_category_idx" ON "prompts"("type", "category");

-- Add check constraint for type enum
ALTER TABLE "prompts" ADD CONSTRAINT "prompts_type_check" 
  CHECK ("type" IN ('image', 'video', 'image-to-video'));