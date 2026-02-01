-- Migration: Fix ON DELETE CASCADE for department_organization_id_fkey
-- This migration updates the foreign key constraint to enable cascade deletion
-- when an organization is deleted, all associated departments will also be deleted.

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE ONLY "public"."department"
    DROP CONSTRAINT IF EXISTS "department_organization_id_fkey";

-- Step 2: Re-add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE ONLY "public"."department"
    ADD CONSTRAINT "department_organization_id_fkey" 
    FOREIGN KEY ("organization_id") 
    REFERENCES "public"."organization"("id") 
    ON DELETE CASCADE;
