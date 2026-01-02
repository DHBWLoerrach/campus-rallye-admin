-- ============================================================================
-- Migration: v2 → v3
-- ============================================================================
-- Änderungen:
--   1. ENUM rallye_status ändern:
--      - ALT: 'preparing', 'running', 'post_processing', 'ended', 'inactive'
--      - NEU: 'preparing', 'inactive', 'running', 'voting', 'ranking', 'ended'
--   2. Bestehende Rallyes mit 'post_processing' → 'ranking' migrieren
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Bestehende Rallyes mit 'post_processing' Status temporär auf 'ended' setzen
--    (wird später auf 'ranking' gesetzt, nachdem der ENUM geändert wurde)
-- ============================================================================

-- Temporäre Tabelle um IDs der betroffenen Rallyes zu speichern
CREATE TEMP TABLE temp_post_processing_rallyes AS
SELECT "id" FROM "public"."rallye" WHERE "status" = 'post_processing';

-- Temporär auf 'ended' setzen (existiert in beiden ENUM-Versionen)
UPDATE "public"."rallye" 
SET "status" = 'ended' 
WHERE "id" IN (SELECT "id" FROM temp_post_processing_rallyes);


-- ============================================================================
-- 2. ENUM rallye_status neu erstellen
-- ============================================================================

-- Neuen ENUM-Typ erstellen
CREATE TYPE "public"."rallye_status_new" AS ENUM (
    'preparing',
    'inactive',
    'running',
    'voting',
    'ranking',
    'ended'
);

-- Spalte auf neuen ENUM-Typ umstellen
ALTER TABLE "public"."rallye" 
    ALTER COLUMN "status" TYPE "public"."rallye_status_new" 
    USING "status"::text::"public"."rallye_status_new";

-- Alten ENUM-Typ löschen
DROP TYPE "public"."rallye_status";

-- Neuen ENUM-Typ umbenennen
ALTER TYPE "public"."rallye_status_new" RENAME TO "rallye_status";


-- ============================================================================
-- 3. Betroffene Rallyes auf 'ranking' Status setzen
-- ============================================================================

UPDATE "public"."rallye" 
SET "status" = 'ranking' 
WHERE "id" IN (SELECT "id" FROM temp_post_processing_rallyes);

-- Temporäre Tabelle löschen
DROP TABLE temp_post_processing_rallyes;


COMMIT;

-- ============================================================================
-- Migration v2 → v3 abgeschlossen
-- ============================================================================
