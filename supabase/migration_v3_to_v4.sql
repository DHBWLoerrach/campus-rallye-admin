-- Migration v3 to v4: Add qr_generated_at field for QR code questions
ALTER TABLE "public"."answers"
  ADD COLUMN IF NOT EXISTS "qr_generated_at" timestamp with time zone;

COMMENT ON COLUMN "public"."answers"."qr_generated_at" IS
  'Timestamp der letzten QR-Code-Generierung (nur für qr_code Fragen)';
