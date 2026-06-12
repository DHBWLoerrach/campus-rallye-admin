-- ============================================================================
-- Migration: v3 → v4
-- ============================================================================
-- Änderungen:
--   1. Tabelle "profiles" entfernen.
--      Die Profil-/Admin-Verwaltung wurde aus Supabase in die lokale
--      SQLite-Datenbank "local_users" (on-prem) verlagert. Dadurch verarbeitet
--      Supabase keine personenbezogenen Mitarbeiterdaten mehr.
--
-- Voraussetzungen (vor Ausführung):
--   1. Etwaige Admin-Kennzeichnungen aus "public"."profiles" wurden manuell in
--      die lokale "local_users" übertragen (SQL: UPDATE local_users SET admin=1
--      WHERE user_id IN (...)).
--   2. Die SQLite-Tabelle "local_users" enthält bereits die Spalte "admin"
--      (siehe README, Migrations-Hinweis zur lokalen DB).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RLS-Policy auf profiles entfernen
-- ============================================================================

DROP POLICY IF EXISTS "Enable write for authenticated users only"
    ON "public"."profiles";


-- ============================================================================
-- 2. Tabelle profiles löschen
-- ============================================================================

DROP TABLE IF EXISTS "public"."profiles";


COMMIT;

-- ============================================================================
-- Migration v3 → v4 abgeschlossen
-- ============================================================================
