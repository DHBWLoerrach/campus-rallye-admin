-- Rename schema objects to match the CONTEXT.md domain glossary.
-- Rename-only: no structural changes. Run once per environment (dev, then prod).
BEGIN;

-- 1. Tables
ALTER TABLE "public"."rallye" RENAME TO "rallyes";
ALTER TABLE "public"."rallye_team" RENAME TO "teams";
ALTER TABLE "public"."join_rallye_questions" RENAME TO "rallye_questions";
ALTER TABLE "public"."questions_geocaching" RENAME TO "geocaching_questions";
ALTER TABLE "public"."answers" RENAME TO "solution_options";
ALTER TABLE "public"."team_questions" RENAME TO "team_answers";
ALTER TABLE "public"."location" RENAME TO "locations";
ALTER TABLE "public"."department" RENAME TO "departments";
ALTER TABLE "public"."voting_finalization" RENAME TO "voting_finalizations";

-- 2. Columns
ALTER TABLE "public"."rallyes" RENAME COLUMN "password" TO "rallye_code";
ALTER TABLE "public"."rallyes" RENAME COLUMN "end_time" TO "rallye_end";
ALTER TABLE "public"."teams" RENAME COLUMN "time_played" TO "play_time";
ALTER TABLE "public"."questions" RENAME COLUMN "points" TO "point_value";
ALTER TABLE "public"."team_answers" RENAME COLUMN "points" TO "team_points";
ALTER TABLE "public"."team_answers" RENAME COLUMN "team_answer" TO "answer";
ALTER TABLE "public"."geocaching_questions" RENAME COLUMN "geocaching_input_type" TO "input_type";

-- 3. Constraints
ALTER TABLE "public"."rallyes" RENAME CONSTRAINT "rallye_pkey" TO "rallyes_pkey";
ALTER TABLE "public"."rallyes" RENAME CONSTRAINT "rallye_department_id_fkey" TO "rallyes_department_id_fkey";
ALTER TABLE "public"."teams" RENAME CONSTRAINT "rallyeTeam_pkey" TO "teams_pkey";
ALTER TABLE "public"."teams" RENAME CONSTRAINT "rallyeTeam_rallye_id_fkey" TO "teams_rallye_id_fkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_pkey" TO "rallye_questions_pkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_question_id_fkey" TO "rallye_questions_question_id_fkey";
ALTER TABLE "public"."rallye_questions" RENAME CONSTRAINT "JOIN_rallye_questions_rallye_id_fkey" TO "rallye_questions_rallye_id_fkey";
ALTER TABLE "public"."solution_options" RENAME CONSTRAINT "answers_pkey" TO "solution_options_pkey";
ALTER TABLE "public"."solution_options" RENAME CONSTRAINT "answers_question_id_fkey" TO "solution_options_question_id_fkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_pkey" TO "team_answers_pkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "team_questions_team_id_question_id_key" TO "team_answers_team_id_question_id_key";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_question_id_fkey" TO "team_answers_question_id_fkey";
ALTER TABLE "public"."team_answers" RENAME CONSTRAINT "teamQuestions_team_id_fkey" TO "team_answers_team_id_fkey";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_pkey" TO "geocaching_questions_pkey";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_input_type_check" TO "geocaching_questions_input_type_check";
ALTER TABLE "public"."geocaching_questions" RENAME CONSTRAINT "questions_geocaching_question_id_fkey" TO "geocaching_questions_question_id_fkey";
ALTER TABLE "public"."locations" RENAME CONSTRAINT "location_pkey" TO "locations_pkey";
ALTER TABLE "public"."locations" RENAME CONSTRAINT "location_default_rallye_id_fkey" TO "locations_default_rallye_id_fkey";
ALTER TABLE "public"."departments" RENAME CONSTRAINT "department_pkey" TO "departments_pkey";
ALTER TABLE "public"."departments" RENAME CONSTRAINT "department_location_id_fkey" TO "departments_location_id_fkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_pkey" TO "voting_finalizations_pkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_question_id_fkey" TO "voting_finalizations_question_id_fkey";
ALTER TABLE "public"."voting_finalizations" RENAME CONSTRAINT "voting_finalization_rallye_id_fkey" TO "voting_finalizations_rallye_id_fkey";

-- 4. Indexes
ALTER INDEX "public"."rallye_department_id_idx" RENAME TO "rallyes_department_id_idx";

-- 5. Sequences
ALTER SEQUENCE "public"."rallye_id_seq" RENAME TO "rallyes_id_seq";
ALTER SEQUENCE "public"."rallye_team_id_seq" RENAME TO "teams_id_seq";
ALTER SEQUENCE "public"."answers_id_seq" RENAME TO "solution_options_id_seq";
ALTER SEQUENCE "public"."team_questions_id_seq" RENAME TO "team_answers_id_seq";
ALTER SEQUENCE "public"."location_id_seq" RENAME TO "locations_id_seq";
ALTER SEQUENCE "public"."department_id_seq" RENAME TO "departments_id_seq";

-- 6. Functions (bodies updated to new names; two functions renamed)
DROP FUNCTION IF EXISTS "public"."JOIN_question_answer"(bigint);
CREATE OR REPLACE FUNCTION "public"."join_question_answer"("rallye_id" bigint) RETURNS "record"
    LANGUAGE "sql"
    AS $$SELECT *
FROM solution_options A, rallye_questions RQ
WHERE RQ.rallye_id = rallye_id
AND RQ.question_id = A.question_id$$;
ALTER FUNCTION "public"."join_question_answer"("rallye_id" bigint) OWNER TO "postgres";

CREATE OR REPLACE FUNCTION "public"."auto_finalize_voting"() RETURNS trigger
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    voting_question record;
BEGIN
    IF OLD."status" = 'voting' AND NEW."status" IN ('results', 'ended') THEN
        FOR voting_question IN
            SELECT "question_id"
            FROM "public"."rallye_questions"
            WHERE "rallye_id" = NEW."id"
                AND "is_voting" = true
        LOOP
            PERFORM "public"."finalize_voting_for_question"(NEW."id", voting_question."question_id");
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) RETURNS void
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    rallye_status "public"."rallye_status";
BEGIN
    IF "voting_team_id_param" = "voted_for_team_id_param" THEN
        RAISE EXCEPTION 'Voting team cannot vote for itself.';
    END IF;

    SELECT "status" INTO rallye_status
    FROM "public"."rallyes" WHERE "id" = "rallye_id_param";

    IF rallye_status IS NULL THEN
        RAISE EXCEPTION 'Rallye % does not exist.', "rallye_id_param";
    END IF;
    IF rallye_status <> 'voting' THEN
        RAISE EXCEPTION 'Rallye % is not in voting status.', "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."rallye_questions"
        WHERE "rallye_id" = "rallye_id_param"
            AND "question_id" = "question_id_param"
            AND "is_voting" = true
    ) THEN
        RAISE EXCEPTION 'Question % is not a voting question for rallye %.', "question_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."teams"
        WHERE "id" = "voting_team_id_param" AND "rallye_id" = "rallye_id_param"
    ) THEN
        RAISE EXCEPTION 'Voting team % does not belong to rallye %.', "voting_team_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."teams"
        WHERE "id" = "voted_for_team_id_param" AND "rallye_id" = "rallye_id_param"
    ) THEN
        RAISE EXCEPTION 'Voted-for team % does not belong to rallye %.', "voted_for_team_id_param", "rallye_id_param";
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM "public"."team_answers"
        WHERE "team_id" = "voted_for_team_id_param"
            AND "question_id" = "question_id_param"
            AND "answer" IS NOT NULL
            AND btrim("answer") <> ''
    ) THEN
        RAISE EXCEPTION 'Voted-for team % has no answer for question %.', "voted_for_team_id_param", "question_id_param";
    END IF;

    INSERT INTO "public"."voting_votes" (
        "rallye_id", "question_id", "voting_team_id", "voted_for_team_id"
    )
    VALUES (
        "rallye_id_param", "question_id_param", "voting_team_id_param", "voted_for_team_id_param"
    )
    ON CONFLICT ("rallye_id", "question_id", "voting_team_id") DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."finalize_voting_for_question"("rallye_id_param" bigint, "question_id_param" bigint) RETURNS void
        LANGUAGE "plpgsql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
DECLARE
    did_finalize_count integer := 0;
    winner_team_id bigint;
    question_points bigint := 0;
BEGIN
    INSERT INTO "public"."voting_finalizations" ("rallye_id", "question_id")
    VALUES ("rallye_id_param", "question_id_param")
    ON CONFLICT ("rallye_id", "question_id") DO NOTHING;

    GET DIAGNOSTICS did_finalize_count = ROW_COUNT;
    IF did_finalize_count = 0 THEN
        RETURN;
    END IF;

    SELECT COALESCE("questions"."point_value", 0) INTO question_points
    FROM "public"."questions" WHERE "questions"."id" = "question_id_param";

    SELECT "voting_votes"."voted_for_team_id" INTO winner_team_id
    FROM "public"."voting_votes"
    INNER JOIN "public"."team_answers"
        ON "team_answers"."team_id" = "voting_votes"."voted_for_team_id"
     AND "team_answers"."question_id" = "voting_votes"."question_id"
    WHERE "voting_votes"."rallye_id" = "rallye_id_param"
        AND "voting_votes"."question_id" = "question_id_param"
        AND "team_answers"."answer" IS NOT NULL
        AND btrim("team_answers"."answer") <> ''
    GROUP BY "voting_votes"."voted_for_team_id"
    ORDER BY COUNT(*) DESC, MIN("voting_votes"."created_at") ASC, "voting_votes"."voted_for_team_id" ASC
    LIMIT 1;

    IF winner_team_id IS NULL THEN
        RETURN;
    END IF;

    UPDATE "public"."team_answers"
    SET "correct" = true, "team_points" = question_points
    WHERE "team_id" = winner_team_id AND "question_id" = "question_id_param";
END;
$$;

CREATE OR REPLACE FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) RETURNS TABLE("question_id" bigint)
        LANGUAGE "sql" SECURITY DEFINER
        SET search_path TO 'public'
        AS $$
        SELECT "voting_votes"."question_id"
        FROM "public"."voting_votes"
        INNER JOIN "public"."teams"
            ON "teams"."id" = "voting_votes"."voting_team_id"
         AND "teams"."rallye_id" = "voting_votes"."rallye_id"
        WHERE "voting_votes"."rallye_id" = "rallye_id_param"
            AND "voting_votes"."voting_team_id" = "voting_team_id_param";
$$;

DROP FUNCTION IF EXISTS "public"."increment_team_question_points"(integer);
CREATE OR REPLACE FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) RETURNS "public"."team_answers"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  updated_row team_answers%ROWTYPE;
BEGIN
  UPDATE team_answers
  SET team_points = team_points + 1
  WHERE id = target_answer_id
  RETURNING * INTO updated_row;
  RETURN updated_row;
END;
$$;
ALTER FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) OWNER TO "postgres";

-- 7. Re-grant the two renamed functions (grants on the old names were dropped)
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "service_role";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "service_role";

COMMIT;
