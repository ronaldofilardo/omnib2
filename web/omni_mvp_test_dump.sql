--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AuditOrigin; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditOrigin" AS ENUM (
    'API_EXTERNA',
    'PORTAL_PUBLICO',
    'PORTAL_LOGADO'
);


ALTER TYPE public."AuditOrigin" OWNER TO postgres;

--
-- Name: AuditStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditStatus" AS ENUM (
    'SUCCESS',
    'USER_NOT_FOUND',
    'VALIDATION_ERROR',
    'SERVER_ERROR',
    'PROCESSING'
);


ALTER TYPE public."AuditStatus" OWNER TO postgres;

--
-- Name: EventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EventType" AS ENUM (
    'CONSULTA',
    'EXAME'
);


ALTER TYPE public."EventType" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'UNREAD',
    'READ',
    'ARCHIVED'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationType" AS ENUM (
    'LAB_RESULT'
);


ALTER TYPE public."NotificationType" OWNER TO postgres;

--
-- Name: ReportStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ReportStatus" AS ENUM (
    'SENT',
    'RECEIVED',
    'VIEWED',
    'ARCHIVED'
);


ALTER TYPE public."ReportStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'RECEPTOR',
    'EMISSOR',
    'ADMIN'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    action text DEFAULT 'DOCUMENT_SUBMITTED'::text NOT NULL,
    origin public."AuditOrigin" NOT NULL,
    "emitterCnpj" text,
    "receiverCpf" text NOT NULL,
    "patientId" text,
    "patientName" text,
    protocol text,
    "fileName" text NOT NULL,
    "ipAddress" text NOT NULL,
    "userAgent" text,
    status public."AuditStatus" DEFAULT 'PROCESSING'::public."AuditStatus" NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receivedAt" timestamp(3) without time zone NOT NULL,
    "fileHash" text,
    "documentType" text DEFAULT 'result'::text
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: VerificationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."VerificationToken" (
    id integer NOT NULL,
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VerificationToken" OWNER TO postgres;

--
-- Name: VerificationToken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."VerificationToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."VerificationToken_id_seq" OWNER TO postgres;

--
-- Name: VerificationToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."VerificationToken_id_seq" OWNED BY public."VerificationToken".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: admin_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_metrics (
    id text DEFAULT 'singleton'::text NOT NULL,
    "totalFiles" integer DEFAULT 0 NOT NULL,
    "totalUploadBytes" bigint DEFAULT 0 NOT NULL,
    "totalDownloadBytes" bigint DEFAULT 0 NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.admin_metrics OWNER TO postgres;

--
-- Name: emissor_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emissor_info (
    id text NOT NULL,
    "userId" text NOT NULL,
    "clinicName" text NOT NULL,
    cnpj text,
    address text,
    contact text
);


ALTER TABLE public.emissor_info OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id text NOT NULL,
    "eventId" text,
    "professionalId" text,
    slot text NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    "uploadDate" text,
    "expiryDate" text,
    is_orphan boolean DEFAULT false NOT NULL,
    orphaned_reason text,
    "physicalPath" text NOT NULL,
    "fileHash" text
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: health_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.health_events (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    date text NOT NULL,
    type public."EventType" NOT NULL,
    "userId" text NOT NULL,
    "endTime" text NOT NULL,
    "professionalId" text NOT NULL,
    "startTime" text NOT NULL,
    observation text
);


ALTER TABLE public.health_events OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    payload jsonb NOT NULL,
    status public."NotificationStatus" DEFAULT 'UNREAD'::public."NotificationStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    documento text
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: professionals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.professionals (
    id text NOT NULL,
    name text NOT NULL,
    specialty text NOT NULL,
    address text,
    contact text,
    "userId" text NOT NULL
);


ALTER TABLE public.professionals OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id text NOT NULL,
    protocol text NOT NULL,
    title text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    status public."ReportStatus" DEFAULT 'SENT'::public."ReportStatus" NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    "sentAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "receivedAt" timestamp(3) without time zone,
    "viewedAt" timestamp(3) without time zone,
    "notificationId" text,
    paciente_id text
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    cpf text,
    telefone text,
    role public."UserRole" DEFAULT 'RECEPTOR'::public."UserRole" NOT NULL,
    "acceptedPrivacyPolicy" boolean DEFAULT false NOT NULL,
    "acceptedTermsOfUse" boolean DEFAULT false NOT NULL,
    "emailVerified" timestamp(3) without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: VerificationToken id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VerificationToken" ALTER COLUMN id SET DEFAULT nextval('public."VerificationToken_id_seq"'::regclass);


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, action, origin, "emitterCnpj", "receiverCpf", "patientId", "patientName", protocol, "fileName", "ipAddress", "userAgent", status, metadata, "createdAt", "receivedAt", "fileHash", "documentType") FROM stdin;
\.


--
-- Data for Name: VerificationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VerificationToken" (id, identifier, token, expires) FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
349a2374-4b14-42b0-b0e8-8c2c0a7c5e0f	7f73356c9d38287b513fa1f4b0c663c5ebecb87f9b55c519fdd644fdb0d167bc	2025-11-28 20:31:36.206754-03	20251023224903_add_contact_to_professional	\N	\N	2025-11-28 20:31:36.151088-03	1
c9883019-aed4-4ff3-ab9a-f688d6f7f243	32abd40be5c2f0374d147e07beed0e85c2039fabbfd95acfa83380a23e4c5ad8	2025-11-28 20:31:36.321862-03	20251118025223_create_files_table	\N	\N	2025-11-28 20:31:36.310278-03	1
5dad7592-be24-40a5-b719-52d373bbd6b8	fe83c0813169fd4ac7586d7cdc9ffd5442398d9f8d0f077b8ce4d044477ec5a6	2025-11-28 20:31:36.211436-03	20251024011725_add_professional_id_to_events	\N	\N	2025-11-28 20:31:36.207431-03	1
4b66c40b-6ad5-48f4-a710-e1ae6bca5567	a3fc4478e94d5f9d9eb870a509dad14bd6eae8276f6eae9cdc6012b1853b30cb	2025-11-28 20:31:36.21433-03	20251024122847_update_files_field	\N	\N	2025-11-28 20:31:36.212035-03	1
9e6c3c6d-fa9c-41e8-b1c3-0c955b6a00d9	7ca1a37b65e249dd6c6762754fe0c0b29cebaf4a44f5032cf185e41654849a54	2025-11-28 20:31:36.367255-03	20251124220955_add_terms_acceptance	\N	\N	2025-11-28 20:31:36.363883-03	1
6e046dfc-119a-41a6-99a7-577779e9d4be	ea060fe0041708e3dff9d64d7a97b9d74d0e324fb49ee61096b63eb7f60cdbc9	2025-11-28 20:31:36.224273-03	20251024144337_update_files_to_jsonb	\N	\N	2025-11-28 20:31:36.214933-03	1
7e3ab8f8-6583-4ab7-b667-8a9e79b38ae5	4f71d9c272d09e13093ee42ef64a315af21c35d6ab2b1b5d020cfc15060bc20c	2025-11-28 20:31:36.326727-03	20251118025454_file_event_ondelete_setnull	\N	\N	2025-11-28 20:31:36.322627-03	1
ece891cc-786e-495a-8b3f-4d971ab68914	32a281d3d9c38d9a2ee284dbc6e0818412005ef867af8d2031ea141c00051b49	2025-11-28 20:31:36.237199-03	20251024233744_date_to_string	\N	\N	2025-11-28 20:31:36.224904-03	1
24a13617-2550-4d05-a768-522a9b23bca7	7e05acacf9d6107973905feee69f60e7e5d51046f5b69b7a7ca39bc4ad71ec14	2025-11-28 20:31:36.247311-03	20251027012122_rename_event_types	\N	\N	2025-11-28 20:31:36.237784-03	1
5d1214a2-3d46-4977-9adf-460b3332c684	771b1d5785c4d8fc1f4f3ee7bf92deeefe1b9768a70b8ee02c58240fba943937	2025-11-28 20:31:36.261328-03	20251027155258_add_notifications	\N	\N	2025-11-28 20:31:36.247873-03	1
ae2d0ba9-458e-40b1-af2e-f59e388834fe	ce0940c1da994fbdf9dd8136174ec33506260630dbc595cd2b9c673e49d5ce21	2025-11-28 20:31:36.329351-03	20251121191604_add_admin_role	\N	\N	2025-11-28 20:31:36.327397-03	1
3b6ec682-08da-498d-8d84-85c2b0337512	5a187dac3b20cab9598e8a9b1ee0161efc5b8bec730c3e465a0bc21d6d12e1e1	2025-11-28 20:31:36.264032-03	20251028233856_add_cpf_telefone_to_user	\N	\N	2025-11-28 20:31:36.261888-03	1
8899a967-9ebc-43fd-a32b-e4ff910e2ed0	7cbf2311b6f54ceaee6ad0056d940994ee09d218a2dfb107d6bc8db0706011cb	2025-11-28 20:31:36.291672-03	20251030120823_add_report_tracking	\N	\N	2025-11-28 20:31:36.264606-03	1
c82d83d7-cb77-4d7a-b04a-c32c5d9bae5b	6772a365cd23f1414782aa3bc727ad35cf9cd3fc01284cfcd8ceb47cc0b494dd	2025-11-28 20:31:36.294333-03	20251101115652_add_documento_to_notifications	\N	\N	2025-11-28 20:31:36.292224-03	1
6a0e61b9-27ca-4d6e-a54a-723666e7fb70	a225665e6772259e0f24daaf27e246f347e2c8feb40ad83aca061762e1fa1b5a	2025-11-28 20:31:36.348102-03	20251124111220_add_audit_log_v2	\N	\N	2025-11-28 20:31:36.32981-03	1
01af0185-41f8-485d-bbef-fe3f0360c53b	ff7d3b64e0ee107f5520730d7e9c47d509bb90e29ee8d54038a77c09f03b8b8d	2025-11-28 20:31:36.297255-03	20251102185841_add_observation_to_health_event	\N	\N	2025-11-28 20:31:36.294971-03	1
74aaca13-63b7-4dd8-9729-cd0ebb362078	3b9e674fc0c61483d876c2a832c828e5cf19961cd7680bf3f5761d8363fa150d	2025-11-28 20:31:36.30455-03	20251114162114_add_paciente_id_to_user	\N	\N	2025-11-28 20:31:36.297866-03	1
c104dc11-7417-449c-b69b-705e829f6d5e	75f1f87349f9b6dfc797b52ef41f6a7d3e1c309a695c8a9d1a9b74d9e9e1b69a	2025-11-28 20:31:36.380186-03	20251126025401_add_email_verified_field	\N	\N	2025-11-28 20:31:36.369412-03	1
f33e062b-8ed0-458b-a03f-41dfd3c0c4d9	08096681440eee9270608ac668dd282124bd35fbe1c1f43e575e6e14fac0c8f1	2025-11-28 20:31:36.309412-03	20251114164357_move_paciente_id_to_report	\N	\N	2025-11-28 20:31:36.305232-03	1
9831a9d8-fe03-48b3-a18e-cd2f614e54eb	1928b12b1a4ccfba2b3ec06a72987bf0b41c5ae09afdabc7365565a8e97dc2cb	2025-11-28 20:31:36.355771-03	20251124120522_add_file_hash_to_audit_log	\N	\N	2025-11-28 20:31:36.348931-03	1
465190c5-be15-4a0f-951d-d2f27ce73714	45eea82f197050d5f76044fdb9dad8621700a16012f32dfa2174052a8cb93c33	2025-11-28 20:31:36.358475-03	20251124160043_add_document_type_to_audit_log	\N	\N	2025-11-28 20:31:36.356356-03	1
3e7d937a-c2a7-4068-a45a-215b4b92e331	122d743a0403e77ad7e0ed9447f5b8826f2fbdbc55612d936eff004dd13c2eec	2025-11-28 20:31:36.360709-03	20251124160251_add_document_type_to_audit_log	\N	\N	2025-11-28 20:31:36.359088-03	1
92b400bd-a3ad-42d3-891e-125abd1d9b55	a8eebf544cc6aded6ab72ef1b6dbf7b8025ab5a7d917b8d5dabc203f6f9eaeeb	2025-11-28 20:31:36.363313-03	20251124163718_add_file_hash_to_files	\N	\N	2025-11-28 20:31:36.361268-03	1
\.


--
-- Data for Name: admin_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admin_metrics (id, "totalFiles", "totalUploadBytes", "totalDownloadBytes", "updatedAt") FROM stdin;
\.


--
-- Data for Name: emissor_info; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.emissor_info (id, "userId", "clinicName", cnpj, address, contact) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.files (id, "eventId", "professionalId", slot, name, url, "uploadDate", "expiryDate", is_orphan, orphaned_reason, "physicalPath", "fileHash") FROM stdin;
\.


--
-- Data for Name: health_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.health_events (id, title, description, date, type, "userId", "endTime", "professionalId", "startTime", observation) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, "userId", type, payload, status, "createdAt", "updatedAt", documento) FROM stdin;
\.


--
-- Data for Name: professionals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.professionals (id, name, specialty, address, contact, "userId") FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, protocol, title, "fileName", "fileUrl", status, "senderId", "receiverId", "sentAt", "receivedAt", "viewedAt", "notificationId", paciente_id) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password, name, "createdAt", "updatedAt", cpf, telefone, role, "acceptedPrivacyPolicy", "acceptedTermsOfUse", "emailVerified") FROM stdin;
\.


--
-- Name: VerificationToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."VerificationToken_id_seq"', 1, false);


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: VerificationToken VerificationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."VerificationToken"
    ADD CONSTRAINT "VerificationToken_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: admin_metrics admin_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_metrics
    ADD CONSTRAINT admin_metrics_pkey PRIMARY KEY (id);


--
-- Name: emissor_info emissor_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emissor_info
    ADD CONSTRAINT emissor_info_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: health_events health_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT health_events_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: professionals professionals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT professionals_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_createdAt_idx" ON public."AuditLog" USING btree ("createdAt");


--
-- Name: AuditLog_fileHash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_fileHash_idx" ON public."AuditLog" USING btree ("fileHash");


--
-- Name: AuditLog_origin_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_origin_idx" ON public."AuditLog" USING btree (origin);


--
-- Name: AuditLog_receiverCpf_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_receiverCpf_idx" ON public."AuditLog" USING btree ("receiverCpf");


--
-- Name: AuditLog_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_status_idx" ON public."AuditLog" USING btree (status);


--
-- Name: VerificationToken_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON public."VerificationToken" USING btree (identifier, token);


--
-- Name: VerificationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "VerificationToken_token_key" ON public."VerificationToken" USING btree (token);


--
-- Name: emissor_info_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "emissor_info_userId_key" ON public.emissor_info USING btree ("userId");


--
-- Name: notifications_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_status_idx ON public.notifications USING btree (status);


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: reports_notificationId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "reports_notificationId_key" ON public.reports USING btree ("notificationId");


--
-- Name: reports_protocol_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX reports_protocol_key ON public.reports USING btree (protocol);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: emissor_info emissor_info_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emissor_info
    ADD CONSTRAINT "emissor_info_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: files files_eventId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "files_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES public.health_events(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: files files_professionalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "files_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES public.professionals(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: health_events health_events_professionalId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT "health_events_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES public.professionals(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: health_events health_events_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.health_events
    ADD CONSTRAINT "health_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: professionals professionals_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.professionals
    ADD CONSTRAINT "professionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: reports reports_notificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "reports_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES public.notifications(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reports reports_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "reports_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: reports reports_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "reports_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

