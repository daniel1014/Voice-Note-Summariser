-- CreateIndex
-- Ensures titles are unique to support upserts in seed script
CREATE UNIQUE INDEX "Transcript_title_key" ON "public"."Transcript"("title");


