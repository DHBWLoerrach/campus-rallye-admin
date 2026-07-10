

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


CREATE TYPE "public"."question_type" AS ENUM (
    'multiple_choice',
    'knowledge',
    'picture',
    'qr_code',
    'upload',
    'geocaching'
);

ALTER TYPE "public"."question_type" OWNER TO "postgres";


CREATE TYPE "public"."rallye_status" AS ENUM (
    'draft',
    'ready',
    'running',
    'voting',
    'results',
    'ended'
);


ALTER TYPE "public"."rallye_status" OWNER TO "postgres";


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


ALTER FUNCTION "public"."auto_finalize_voting"() OWNER TO "postgres";


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


ALTER FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) OWNER TO "postgres";


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


ALTER FUNCTION "public"."finalize_voting_for_question"("rallye_id_param" bigint, "question_id_param" bigint) OWNER TO "postgres";


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


ALTER FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) OWNER TO "postgres";


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."team_answers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "question_id" bigint NOT NULL,
    "team_id" bigint NOT NULL,
    "correct" boolean NOT NULL,
    "team_points" bigint NOT NULL,
    "answer" "text"
);


ALTER TABLE "public"."team_answers" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."solution_options" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "text" "text",
    "correct" boolean DEFAULT true NOT NULL,
    "question_id" bigint
);


ALTER TABLE "public"."solution_options" OWNER TO "postgres";


ALTER TABLE "public"."solution_options" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."solution_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rallye_questions" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rallye_id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "is_voting" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."rallye_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text" NOT NULL,
    "type" "public"."question_type" NOT NULL,
    "point_value" bigint,
    "hint" "text",
    "category" "text",
    "bucket_path" "text"
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."geocaching_questions" (
    "question_id" bigint NOT NULL,
    "target_latitude" double precision NOT NULL,
    "target_longitude" double precision NOT NULL,
    "proximity_radius" integer DEFAULT 10 NOT NULL,
    "input_type" text DEFAULT 'text'::text NOT NULL,
    CONSTRAINT "geocaching_questions_input_type_check" CHECK (("input_type" = ANY (ARRAY['text'::text, 'qr'::text])))
);


ALTER TABLE "public"."geocaching_questions" OWNER TO "postgres";


ALTER TABLE "public"."questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rallyes" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "rallye_end" time without time zone,
    "status" "public"."rallye_status" DEFAULT 'draft'::"public"."rallye_status" NOT NULL,
    "name" "text" NOT NULL,
    "rallye_code" "text",
    "department_id" bigint
);


ALTER TABLE "public"."rallyes" OWNER TO "postgres";


ALTER TABLE "public"."rallyes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rallyes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "rallye_id" bigint,
    "play_time" timestamp with time zone
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE "public"."teams" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."teams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."team_answers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."team_answers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."voting_finalizations" (
    "rallye_id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "finalized_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voting_finalizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_votes" (
    "rallye_id" bigint NOT NULL,
    "question_id" bigint NOT NULL,
    "voting_team_id" bigint NOT NULL,
    "voted_for_team_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "voting_votes_no_self_vote" CHECK (("voting_team_id" <> "voted_for_team_id"))
);


ALTER TABLE "public"."voting_votes" OWNER TO "postgres";



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" text NOT NULL,
    "default_rallye_id" bigint
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


ALTER TABLE "public"."locations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" text NOT NULL,
    "location_id" bigint NOT NULL
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


ALTER TABLE "public"."departments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."departments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE ONLY "public"."rallye_questions"
    ADD CONSTRAINT "rallye_questions_pkey" PRIMARY KEY ("rallye_id", "question_id");



ALTER TABLE ONLY "public"."solution_options"
    ADD CONSTRAINT "solution_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rallyes"
    ADD CONSTRAINT "rallyes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_answers"
    ADD CONSTRAINT "team_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."geocaching_questions"
    ADD CONSTRAINT "geocaching_questions_pkey" PRIMARY KEY ("question_id");



ALTER TABLE ONLY "public"."team_answers"
    ADD CONSTRAINT "team_answers_team_id_question_id_key" UNIQUE ("team_id", "question_id");



ALTER TABLE ONLY "public"."voting_finalizations"
    ADD CONSTRAINT "voting_finalizations_pkey" PRIMARY KEY ("rallye_id", "question_id");



ALTER TABLE ONLY "public"."voting_votes"
    ADD CONSTRAINT "voting_votes_unique_voter" UNIQUE ("rallye_id", "question_id", "voting_team_id");



CREATE INDEX "voting_votes_rallye_question_idx" ON "public"."voting_votes" USING btree ("rallye_id", "question_id");



CREATE INDEX "voting_votes_target_idx" ON "public"."voting_votes" USING btree ("rallye_id", "question_id", "voted_for_team_id");



CREATE TRIGGER "trigger_auto_finalize_voting" AFTER UPDATE OF "status" ON "public"."rallyes" FOR EACH ROW WHEN ((old."status" IS DISTINCT FROM new."status")) EXECUTE FUNCTION "public"."auto_finalize_voting"();



ALTER TABLE ONLY "public"."rallye_questions"
    ADD CONSTRAINT "rallye_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rallye_questions"
    ADD CONSTRAINT "rallye_questions_rallye_id_fkey" FOREIGN KEY ("rallye_id") REFERENCES "public"."rallyes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solution_options"
    ADD CONSTRAINT "solution_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_rallye_id_fkey" FOREIGN KEY ("rallye_id") REFERENCES "public"."rallyes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_answers"
    ADD CONSTRAINT "team_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id");



ALTER TABLE ONLY "public"."team_answers"
    ADD CONSTRAINT "team_answers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."geocaching_questions"
    ADD CONSTRAINT "geocaching_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_finalizations"
    ADD CONSTRAINT "voting_finalizations_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_finalizations"
    ADD CONSTRAINT "voting_finalizations_rallye_id_fkey" FOREIGN KEY ("rallye_id") REFERENCES "public"."rallyes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_votes"
    ADD CONSTRAINT "voting_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_votes"
    ADD CONSTRAINT "voting_votes_rallye_id_fkey" FOREIGN KEY ("rallye_id") REFERENCES "public"."rallyes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_votes"
    ADD CONSTRAINT "voting_votes_voted_for_team_id_fkey" FOREIGN KEY ("voted_for_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_votes"
    ADD CONSTRAINT "voting_votes_voting_team_id_fkey" FOREIGN KEY ("voting_team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_default_rallye_id_fkey" FOREIGN KEY ("default_rallye_id") REFERENCES "public"."rallyes"("id") ON DELETE SET NULL;


ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."rallyes"
    ADD CONSTRAINT "rallyes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE RESTRICT;


CREATE INDEX "rallyes_department_id_idx" ON "public"."rallyes" USING btree ("department_id");



CREATE POLICY "Enable insert access for all users" ON "public"."teams" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."solution_options" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."questions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."geocaching_questions" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."teams" FOR UPDATE USING (true);



CREATE POLICY "Enable write for authenticated users only" ON "public"."solution_options" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write for authenticated users only" ON "public"."rallye_questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write for authenticated users only" ON "public"."questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write for authenticated users only" ON "public"."geocaching_questions" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable write for authenticated users only" ON "public"."rallyes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enabled read access for all users" ON "public"."rallye_questions" FOR SELECT USING (true);



CREATE POLICY "Enabled read access for all users" ON "public"."rallyes" FOR SELECT USING (true);



CREATE POLICY "Enabled read access for all users" ON "public"."teams" FOR SELECT USING (true);



CREATE POLICY "Enabled read access for all users" ON "public"."team_answers" FOR SELECT USING (true);



CREATE POLICY "Enabled write access for all users" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enabled write access for all users" ON "public"."team_answers" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."solution_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rallye_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."geocaching_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rallyes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voting_finalizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voting_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."locations" FOR SELECT USING (true);


CREATE POLICY "Enable write for authenticated users only" ON "public"."locations" TO "authenticated" USING (true) WITH CHECK (true);


CREATE POLICY "Enable read access for all users" ON "public"."departments" FOR SELECT USING (true);


CREATE POLICY "Enable write for authenticated users only" ON "public"."departments" TO "authenticated" USING (true) WITH CHECK (true);


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_question_answer"("rallye_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_finalize_voting"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_finalize_voting"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_voting_vote"("rallye_id_param" bigint, "question_id_param" bigint, "voting_team_id_param" bigint, "voted_for_team_id_param" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_voting_for_question"("rallye_id_param" bigint, "question_id_param" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_voting_for_question"("rallye_id_param" bigint, "question_id_param" bigint) TO "service_role";


GRANT ALL ON FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_voted_voting_question_ids"("rallye_id_param" bigint, "voting_team_id_param" bigint) TO "service_role";


GRANT ALL ON TABLE "public"."team_answers" TO "anon";
GRANT ALL ON TABLE "public"."team_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."team_answers" TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_team_answer_points"("target_answer_id" integer) TO "service_role";



GRANT SELECT ON TABLE "public"."solution_options" TO "anon";
GRANT ALL ON TABLE "public"."solution_options" TO "authenticated";
GRANT ALL ON TABLE "public"."solution_options" TO "service_role";



GRANT SELECT ON SEQUENCE "public"."solution_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."solution_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."solution_options_id_seq" TO "service_role";



GRANT SELECT ON TABLE "public"."rallye_questions" TO "anon";
GRANT ALL ON TABLE "public"."rallye_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."rallye_questions" TO "service_role";

GRANT SELECT ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT SELECT ON TABLE "public"."geocaching_questions" TO "anon";
GRANT ALL ON TABLE "public"."geocaching_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."geocaching_questions" TO "service_role";



GRANT SELECT ON SEQUENCE "public"."questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "service_role";



GRANT SELECT ON TABLE "public"."rallyes" TO "anon";
GRANT ALL ON TABLE "public"."rallyes" TO "authenticated";
GRANT ALL ON TABLE "public"."rallyes" TO "service_role";



GRANT SELECT ON SEQUENCE "public"."rallyes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."rallyes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."rallyes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_answers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_answers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_answers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."voting_finalizations" TO "service_role";



GRANT ALL ON TABLE "public"."voting_votes" TO "service_role";



GRANT SELECT ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";


GRANT SELECT ON SEQUENCE "public"."locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "service_role";


GRANT SELECT ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";


GRANT SELECT ON SEQUENCE "public"."departments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";


RESET ALL;
