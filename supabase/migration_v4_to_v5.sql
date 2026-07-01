-- ============================================================================
-- Migration: v4 -> v5
-- ============================================================================
-- Changes:
--   1. Store upload voting flags on the rallye-question assignment.
--   2. Read voting content from join_rallye_questions.is_voting.
--   3. Drop the legacy voting table. No data migration is needed because
--      production and development do not contain legacy voting rows.
-- ============================================================================

BEGIN;

ALTER TABLE "public"."join_rallye_questions"
    ADD COLUMN IF NOT EXISTS "is_voting" boolean DEFAULT false NOT NULL;

CREATE OR REPLACE FUNCTION "public"."get_voting_content"("rallye_id_param" bigint, "own_team_id_param" bigint) RETURNS TABLE("tq_id" bigint, "tq_team_id" bigint, "tq_question_id" bigint, "tq_points" bigint, "rt_id" bigint, "rt_rallye_id" bigint, "rt_team_name" "text", "tq_team_answer" "text", "question_content" "text", "question_type" "public"."question_type")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT tq.id, tq.team_id, tq.question_id, tq.points,
           rt.id, rt.rallye_id, rt.name, tq.team_answer,
           q.content, q.type
    FROM team_questions AS tq
    JOIN rallye_team AS rt ON tq.team_id = rt.id
    JOIN questions AS q ON tq.question_id = q.id
    WHERE tq.question_id IN (
          SELECT rq.question_id
          FROM join_rallye_questions AS rq
          WHERE rq.rallye_id = rallye_id_param
          AND rq.is_voting = true
    )
    AND rt.rallye_id = rallye_id_param
    AND rt.id != own_team_id_param;
END;
$$;

DROP TABLE IF EXISTS "public"."voting";

COMMIT;

-- ============================================================================
-- Migration v4 -> v5 complete
-- ============================================================================
