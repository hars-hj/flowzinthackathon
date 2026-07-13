


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer DEFAULT 5, "match_threshold" double precision DEFAULT 0.5) RETURNS TABLE("id" "uuid", "filename" "text", "content" "text", "page" integer, "chunk_index" integer, "similarity" double precision)
    LANGUAGE "sql" STABLE
    AS $$
  select
    id,
    filename,
    content,
    page,
    chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;


ALTER FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer, "match_threshold" double precision) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "text",
    "role" "text",
    "content" "text",
    "sentiment" "text",
    "escalated" boolean,
    "seq" bigint NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."conversations_seq_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."conversations_seq_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."conversations_seq_seq" OWNED BY "public"."conversations"."seq";



CREATE TABLE IF NOT EXISTS "public"."document_chunks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text",
    "chunk_index" bigint,
    "page" bigint,
    "content" "text" DEFAULT ''::"text",
    "embedding" "public"."vector"(3072),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "fts" "tsvector" GENERATED ALWAYS AS ("to_tsvector"('"english"'::"regconfig", "content")) STORED
);


ALTER TABLE "public"."document_chunks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."query_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "question" "text" NOT NULL,
    "chunks_retrieved" integer NOT NULL,
    "top_chunk_score" double precision,
    "final_answer" "text" NOT NULL,
    "latency_ms" integer NOT NULL,
    "escalated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."query_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "text" NOT NULL,
    "user_question" "text",
    "status" "text" DEFAULT 'waiting'::"text" NOT NULL,
    "assigned_agent_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."uploaded_docs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "chunk_text" "text",
    "embedding_id" "text",
    "created_at" timestamp with time zone
);


ALTER TABLE "public"."uploaded_docs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_session" (
    "user_id" "uuid" NOT NULL,
    "session_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_session" OWNER TO "postgres";


ALTER TABLE ONLY "public"."conversations" ALTER COLUMN "seq" SET DEFAULT "nextval"('"public"."conversations_seq_seq"'::"regclass");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_chunks"
    ADD CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."query_logs"
    ADD CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_tickets"
    ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."uploaded_docs"
    ADD CONSTRAINT "uploaded_docs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_session"
    ADD CONSTRAINT "user_session_pkey" PRIMARY KEY ("session_id");



CREATE INDEX "document_chunks_fts_idx" ON "public"."document_chunks" USING "gin" ("fts");



CREATE INDEX "idx_user_session_user_id" ON "public"."user_session" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_messages"
    ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_session"
    ADD CONSTRAINT "user_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Service role has full access" ON "public"."profiles" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create their own sessions" ON "public"."user_session" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sessions" ON "public"."user_session" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own sessions" ON "public"."user_session" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_chunks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."query_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."uploaded_docs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_session" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer, "match_threshold" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer, "match_threshold" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."match_chunks"("query_embedding" "public"."vector", "match_count" integer, "match_threshold" double precision) TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."conversations_seq_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."conversations_seq_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."conversations_seq_seq" TO "service_role";



GRANT ALL ON TABLE "public"."document_chunks" TO "anon";
GRANT ALL ON TABLE "public"."document_chunks" TO "authenticated";
GRANT ALL ON TABLE "public"."document_chunks" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."query_logs" TO "anon";
GRANT ALL ON TABLE "public"."query_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."query_logs" TO "service_role";



GRANT ALL ON TABLE "public"."support_tickets" TO "anon";
GRANT ALL ON TABLE "public"."support_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."support_tickets" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_messages" TO "anon";
GRANT ALL ON TABLE "public"."ticket_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_messages" TO "service_role";



GRANT ALL ON TABLE "public"."uploaded_docs" TO "anon";
GRANT ALL ON TABLE "public"."uploaded_docs" TO "authenticated";
GRANT ALL ON TABLE "public"."uploaded_docs" TO "service_role";



GRANT ALL ON TABLE "public"."user_session" TO "anon";
GRANT ALL ON TABLE "public"."user_session" TO "authenticated";
GRANT ALL ON TABLE "public"."user_session" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







