--
-- PostgreSQL database dump
--

\restrict z6jQqf2te7Jf9iNB8JfyedVfRO6hVuynniZy6ZAMiFJrgZNhalsn3D0gTZ4BDC0

-- Dumped from database version 15.16
-- Dumped by pg_dump version 15.16

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: assignment_reminders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_reminders (
    id character varying(36) NOT NULL,
    assignment_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    reminder_type character varying(32) NOT NULL,
    target_student_count integer NOT NULL,
    message text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.assignment_reminders OWNER TO postgres;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    title character varying(200) NOT NULL,
    prompt text NOT NULL,
    due_at timestamp with time zone,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: auth_account_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_account_roles (
    auth_account_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.auth_account_roles OWNER TO postgres;

--
-- Name: auth_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_accounts (
    role character varying(20) NOT NULL,
    display_name character varying(100) NOT NULL,
    phone character varying(20),
    created_at timestamp with time zone NOT NULL,
    id uuid NOT NULL,
    email character varying(320) NOT NULL,
    hashed_password character varying(1024) NOT NULL,
    is_active boolean NOT NULL,
    is_superuser boolean NOT NULL,
    is_verified boolean NOT NULL,
    student_profile_completed_at timestamp with time zone,
    teacher_profile_completed_at timestamp with time zone
);


ALTER TABLE public.auth_accounts OWNER TO postgres;

--
-- Name: class_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class_members (
    id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    joined_at timestamp with time zone NOT NULL
);


ALTER TABLE public.class_members OWNER TO postgres;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classes (
    id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    name character varying(120) NOT NULL,
    grade_band character varying(20) NOT NULL,
    join_code character varying(12) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.classes OWNER TO postgres;

--
-- Name: manual_feedback_receipts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manual_feedback_receipts (
    id character varying(36) NOT NULL,
    manual_review_id character varying(36) NOT NULL,
    submission_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    first_viewed_at timestamp with time zone NOT NULL,
    last_viewed_at timestamp with time zone NOT NULL,
    view_count integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.manual_feedback_receipts OWNER TO postgres;

--
-- Name: manual_review_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manual_review_replies (
    id character varying(36) NOT NULL,
    manual_review_id character varying(36) NOT NULL,
    submission_id character varying(36) NOT NULL,
    assignment_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    author_role character varying(20) NOT NULL,
    author_id character varying(36) NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.manual_review_replies OWNER TO postgres;

--
-- Name: manual_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.manual_reviews (
    id character varying(36) NOT NULL,
    submission_id character varying(36) NOT NULL,
    assignment_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    structure_score integer NOT NULL,
    language_score integer NOT NULL,
    value_score integer NOT NULL,
    total_score integer NOT NULL,
    summary_feedback text NOT NULL,
    actionable_suggestions json NOT NULL,
    strengths text,
    next_goal text,
    status character varying(20) NOT NULL,
    version integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    published_at timestamp with time zone
);


ALTER TABLE public.manual_reviews OWNER TO postgres;

--
-- Name: student_memory_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_memory_notes (
    id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    source_submission_id character varying(36) NOT NULL,
    source_review_id character varying(36) NOT NULL,
    agent_name character varying(40) NOT NULL,
    note text NOT NULL,
    tags character varying(200) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.student_memory_notes OWNER TO postgres;

--
-- Name: submission_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submission_reviews (
    id character varying(36) NOT NULL,
    submission_id character varying(36) NOT NULL,
    assignment_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    teacher_id character varying(36) NOT NULL,
    agent_name character varying(40) NOT NULL,
    score integer NOT NULL,
    feedback text NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.submission_reviews OWNER TO postgres;

--
-- Name: submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.submissions (
    id character varying(36) NOT NULL,
    assignment_id character varying(36) NOT NULL,
    class_id character varying(36) NOT NULL,
    student_id character varying(36) NOT NULL,
    content_type character varying(20) NOT NULL,
    text_content text,
    file_name character varying(255),
    file_url character varying(500),
    storage_provider character varying(40) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.submissions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character varying(36) NOT NULL,
    role character varying(20) NOT NULL,
    phone character varying(20),
    display_name character varying(100) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    student_profile_completed_at timestamp with time zone,
    teacher_profile_completed_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: ux_event_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ux_event_logs (
    id character varying(36) NOT NULL,
    user_id character varying(36) NOT NULL,
    role character varying(20) NOT NULL,
    event_name character varying(100) NOT NULL,
    event_category character varying(50) NOT NULL,
    page character varying(160),
    properties_json text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.ux_event_logs OWNER TO postgres;

--
-- Name: wechat_account_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wechat_account_links (
    id character varying(36) NOT NULL,
    auth_account_id uuid NOT NULL,
    unionid character varying(128),
    openid character varying(128) NOT NULL,
    nickname character varying(120),
    avatar_url character varying(500),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.wechat_account_links OWNER TO postgres;

--
-- Name: wechat_bind_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wechat_bind_sessions (
    ticket character varying(64) NOT NULL,
    role character varying(20) NOT NULL,
    unionid character varying(128),
    openid character varying(128) NOT NULL,
    nickname character varying(120),
    avatar_url character varying(500),
    next_path character varying(500),
    expires_at timestamp with time zone NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.wechat_bind_sessions OWNER TO postgres;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
20260223_0008
\.


--
-- Data for Name: assignment_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignment_reminders (id, assignment_id, class_id, teacher_id, reminder_type, target_student_count, message, created_at) FROM stdin;
\.


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignments (id, class_id, teacher_id, title, prompt, due_at, status, created_at) FROM stdin;
827a299e-3c65-418a-8932-d91b5ffe65c4	1bda6cea-15dd-4f18-8d46-2d79ec4ac19f	teacher-ui-test2	联调任务	请写一篇春天的作文。	2026-03-08 00:00:00+00	published	2026-02-18 14:55:06.581145+00
940371ae-aa1d-4f40-8d50-c38b45043566	3b2f0730-6dec-4ed1-b617-30c0b1d105e9	e2d4bfd6-86e1-4856-9815-7bf8f20ff81d	联调任务	请写一篇春天的作文。	2026-03-08 00:00:00+00	published	2026-02-18 16:08:57.210876+00
1706f7e4-82f4-47c9-b032-6d89df6ac0ac	a28a1afb-6142-4eed-af22-e780afd1447b	2d8e66f3-e30c-4fd2-90fd-9511c542a613	我的家乡	请写一篇介绍家乡景色与人情的作文，600字左右。	\N	published	2026-02-18 16:22:50.150102+00
76e7475a-0d38-4876-83f7-e0bf7996d53b	2c823aab-d0c4-4134-86ed-bdc3edda726f	ae901c86-7c11-4a2b-bc80-e6983b65633b	春天	描写春天校园	2026-03-18 08:00:00+00	published	2026-02-18 16:24:44.431977+00
d3e41de5-44d7-4c72-b411-b8cc1a1baee2	8ec3cd67-a088-4e91-b406-51825e734a11	b992bf0a-1785-4b27-b091-27b6cca78b6f	春天	描写春天校园	2026-03-18 08:00:00+00	published	2026-02-18 17:05:07.949355+00
24538bca-416a-48de-b9ff-00800561aecf	9fbd08a5-22d1-4c69-92de-c0d5192a6586	2d2728c3-853d-4d74-a478-e223d22acb0d	深秋	描写深秋校园的一角	2026-04-01 08:00:00+00	published	2026-02-18 23:57:49.777295+00
19623adf-dc2b-4a16-8a53-a6209f3f640b	9906134c-f087-412b-b91a-34a8e5586567	dae68038-3354-45e6-84e7-9a04ac433da1	初冬	描写初冬清晨	2026-05-01 08:00:00+00	published	2026-02-19 00:06:59.00457+00
75f5ae05-3a0f-4844-861f-1b717c9aff60	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	c17b1177-4f8d-4687-b911-9f2394326859	雨后	描写雨后校园	2026-05-02 08:00:00+00	published	2026-02-19 00:17:32.035978+00
1d5e6861-ff4e-40c8-a844-0be6e6407b52	7ed89d96-423f-4177-9197-0dc553f6f4a4	38689f2e-7826-4332-9b2e-cea631c7e27e	我的家乡	请写一篇介绍家乡景色与人情的作文，600字左右。	\N	published	2026-02-19 01:34:00.715878+00
644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	12d977bb-2de5-4827-8daf-8be630d31a4a	我的家乡	请写一篇介绍家乡景色与人情的作文，600字左右。	\N	published	2026-02-19 15:26:26.583036+00
\.


--
-- Data for Name: auth_account_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_account_roles (auth_account_id, role, created_at) FROM stdin;
66d129d7-6c6b-4fcf-bcd3-7a2af34b1cca	teacher	2026-02-23 14:38:48.410934+00
f89a83c3-dbae-46a8-9c77-a7a1a514deb1	teacher	2026-02-23 14:38:48.410934+00
fb7f7202-a25d-49ea-a42f-235ff94c0d8e	teacher	2026-02-23 14:38:48.410934+00
ad23b32e-4ae9-4ff5-81a7-631306036f0d	teacher	2026-02-23 14:38:48.410934+00
846eef8e-8917-40bc-8e52-2d8e5442c688	student	2026-02-23 14:38:48.410934+00
ef54c95d-3cbd-4606-8492-bcbdcb38edc6	teacher	2026-02-23 14:38:48.410934+00
69f90b52-9259-4c90-8c7e-0fa3ab50def0	teacher	2026-02-23 14:38:48.410934+00
70f82213-d3cb-4295-a475-d9a0c09b5742	student	2026-02-23 14:38:48.410934+00
9344d16f-01cc-4733-89bb-8f8d626a7a4d	teacher	2026-02-23 14:38:48.410934+00
02512eb3-9ea7-485f-8704-aa0c4fdec66b	teacher	2026-02-23 14:38:48.410934+00
a137ea96-d0ec-4b36-9abd-c1577ba5e56a	teacher	2026-02-23 14:38:48.410934+00
394dbefa-6949-485b-b769-f074a3be52cf	teacher	2026-02-23 14:38:48.410934+00
773ee5fe-fbf0-4895-aeef-059af258ef0a	teacher	2026-02-23 14:38:48.410934+00
8232c1ac-67ac-4cd5-b12d-73483d63c99e	teacher	2026-02-23 14:38:48.410934+00
7d633305-53a0-4974-a57b-993d8edc7887	teacher	2026-02-23 14:38:48.410934+00
12d977bb-2de5-4827-8daf-8be630d31a4a	teacher	2026-02-23 14:38:48.410934+00
6587f385-626c-41d1-9eb4-eaf6f6e62725	student	2026-02-23 14:38:48.410934+00
\.


--
-- Data for Name: auth_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_accounts (role, display_name, phone, created_at, id, email, hashed_password, is_active, is_superuser, is_verified, student_profile_completed_at, teacher_profile_completed_at) FROM stdin;
teacher	GitHub方案老师	1311460948N	2026-02-19 00:29:13.634144+00	66d129d7-6c6b-4fcf-bcd3-7a2af34b1cca	teacher_1771460948N@example.com	$argon2id$v=19$m=65536,t=3,p=4$ic5qnQPZSdL9vLx7kj4WQw$uzBHrGAgr3i/nthSzTZqheb+J0vt8ae9vNFdoM+8kXM	t	f	f	\N	\N
teacher	GitHub方案老师	1311460962N	2026-02-19 00:29:22.728905+00	f89a83c3-dbae-46a8-9c77-a7a1a514deb1	teacher_1771460962N@example.com	$argon2id$v=19$m=65536,t=3,p=4$NJvPrw9ov6OGcfMfdvFf0A$DJfMqTlH8E/bsn91krG9JadrLQjgWyxtV/ShGyEFrMg	t	f	f	\N	\N
teacher	GitHub方案老师	13149314575	2026-02-19 00:30:49.856796+00	fb7f7202-a25d-49ea-a42f-235ff94c0d8e	teacher_1771461049269082@example.com	$argon2id$v=19$m=65536,t=3,p=4$+OLRnTGQCHMObytvjG/5lw$HUFSJCKO7AYQJ8f2dJnU2Ouzdi9ViwGN6D3WlH5mdwo	t	f	f	\N	\N
teacher	王老师	13800138000	2026-02-19 01:24:37.945902+00	ad23b32e-4ae9-4ff5-81a7-631306036f0d	teacher@example.com	$argon2id$v=19$m=65536,t=3,p=4$84stHgRlBPQS1VvqNGN63A$d3JSESvrIX/aMeTdvkNYGrtMkIjSZbb2uJItBLz/8UI	t	f	f	\N	\N
student	Debug User	\N	2026-02-19 01:29:48.504743+00	846eef8e-8917-40bc-8e52-2d8e5442c688	debug1771464588@example.com	$argon2id$v=19$m=65536,t=3,p=4$l1XmZiLItcN+BEM6e+kaBA$qcasPrjv3zeQsppfBk+S4YUE6h8O2ryC1xWduikyuow	t	f	f	\N	\N
teacher	学生A	\N	2026-02-19 01:47:37.665039+00	ef54c95d-3cbd-4606-8492-bcbdcb38edc6	rolepatch_1771465657N@example.com	$argon2id$v=19$m=65536,t=3,p=4$wFqFbrP1uXnUwm+DrJzyxg$vxYhJ46zbhZFVQCXadvZPeRXHGvPqg9MfPZzQdO66eE	t	f	f	\N	\N
teacher	短信老师	\N	2026-02-19 03:58:20.491291+00	69f90b52-9259-4c90-8c7e-0fa3ab50def0	teacher_sms_1771473500N@example.com	$argon2id$v=19$m=65536,t=3,p=4$7mvEOg72E0+stOOoYP4SCg$rSR6b6E2EJiKzrQoZb4lOwLJhsUjDTvku1/BA80fUME	t	f	f	\N	\N
student	学生	\N	2026-02-19 03:58:20.649552+00	70f82213-d3cb-4295-a475-d9a0c09b5742	student_patch_1771473500N@example.com	$argon2id$v=19$m=65536,t=3,p=4$tcXP8uJC9myqXhS42EI2OQ$/Mlr4GIvDBKEpqNquRFvYJT/70CGeJa21TfSt+s8bDE	t	f	f	\N	\N
teacher	短信老师	1371473520844	2026-02-19 03:58:40.75159+00	9344d16f-01cc-4733-89bb-8f8d626a7a4d	teacher_sms_ok_1771473520_844@example.com	$argon2id$v=19$m=65536,t=3,p=4$8G3hwpMSVR7IVaTKCPD/9A$0ewOJghf/qG8eT4P9YSk+DezMZDP5HumM51DZJxOXU0	t	f	f	\N	\N
teacher	调试老师	\N	2026-02-19 14:41:58.483182+00	02512eb3-9ea7-485f-8704-aa0c4fdec66b	teacher_debug_1771512117'@example.com	$argon2id$v=19$m=65536,t=3,p=4$IBJZ7DgDc9aQoLW5w10WSA$fadnrT9cSh++wT3vfA4GdJF1tHi25/GlQrPLHD4qzLE	t	f	f	\N	\N
teacher	老师A	13800001111	2026-02-19 14:42:20.024024+00	a137ea96-d0ec-4b36-9abd-c1577ba5e56a	teacher_dup_debug@example.com	$argon2id$v=19$m=65536,t=3,p=4$4UcwBYOvWccyTmNT2PTLKA$p2k0Lx5L3yCctQ3MoqwshuzGBcqXs91F2If2XvurBEI	t	f	f	\N	\N
teacher	代理老师	\N	2026-02-19 14:42:37.22954+00	394dbefa-6949-485b-b769-f074a3be52cf	teacher_proxy_debug_1771512156@example.com	$argon2id$v=19$m=65536,t=3,p=4$CZe62K+U1/n1BINpCRPwMA$ppO98mRdwj0m4mtgMvlnxymOO4ydU72YY9H9BwIf09o	t	f	f	\N	\N
teacher	代理老师	13812344321	2026-02-19 14:42:47.258583+00	773ee5fe-fbf0-4895-aeef-059af258ef0a	teacher_proxy_dup@example.com	$argon2id$v=19$m=65536,t=3,p=4$h0OUWWqJTLxD+K30EIk6Bg$3Ytwh5TDS4bcqFOJap5FlsE/ukKJhv2K2XClnSAaq0E	t	f	f	\N	\N
teacher	在线老师	13800013767	2026-02-19 14:55:16.922979+00	8232c1ac-67ac-4cd5-b12d-73483d63c99e	teacher_live_1771512914@example.com	$argon2id$v=19$m=65536,t=3,p=4$JThJGd1N0EQ85ApFRtSPWw$Yq1qiqNGG0IGmWPOpWxX6cePFqSoJRvg47gfK4msOQ4	t	f	f	\N	\N
teacher	在线老师	13800013768	2026-02-19 14:55:33.294586+00	7d633305-53a0-4974-a57b-993d8edc7887	teacher_live_dup@example.com	$argon2id$v=19$m=65536,t=3,p=4$76fatWRjaiSJO63sLHajtA$3oRPA+adhG7JFjxPzhpu9Hl5zAGgZb0kD+bJWTZKnwc	t	f	f	\N	\N
teacher	祝老师	\N	2026-02-19 15:25:58.606407+00	12d977bb-2de5-4827-8daf-8be630d31a4a	yisen99abc@163.com	$argon2id$v=19$m=65536,t=3,p=4$EKB46Vm5/CoHSI//oI+92A$ARHt0OOWOlw7YO2oElvHCiMFWGZs0O5C3uCoxsTfZEA	t	f	f	\N	\N
student	伊森	\N	2026-02-19 15:27:37.543811+00	6587f385-626c-41d1-9eb4-eaf6f6e62725	yisen99abc@126.com	$argon2id$v=19$m=65536,t=3,p=4$naIqh8A+cCOWu5wFHv/YhA$475zqzNN6j9SWkw7z6iTQ1La2Y8jhcAY7/P5GOmz5Jo	t	f	f	\N	\N
\.


--
-- Data for Name: class_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class_members (id, class_id, student_id, joined_at) FROM stdin;
41b7ba4a-eb88-4c02-b159-ff03a0f23fa2	1bda6cea-15dd-4f18-8d46-2d79ec4ac19f	student-ui-test2	2026-02-18 14:55:06.562373+00
38718eab-f067-419c-9307-9e11e03b75ed	3b2f0730-6dec-4ed1-b617-30c0b1d105e9	cb4f69e8-4625-4f26-8c43-7fa1897ac2af	2026-02-18 16:08:57.190981+00
2c40ec51-18c3-4f57-b0c2-69adeac8df35	8ec3cd67-a088-4e91-b406-51825e734a11	fcd2a518-bdb3-4938-a0a1-faecd1bda1b2	2026-02-18 17:05:08.085904+00
58930f40-ba4e-4247-9672-03739544507b	9fbd08a5-22d1-4c69-92de-c0d5192a6586	1d05ff41-efb3-4456-bf32-0dfe18ddb499	2026-02-18 23:57:49.976252+00
e4f67ce2-8a65-4ef0-b45e-5f234815c5f5	9906134c-f087-412b-b91a-34a8e5586567	bb97a531-3b2d-42ab-8417-d33656b3f1fe	2026-02-19 00:06:59.254947+00
ec912734-4ae3-48fc-aa19-5ea6894c8bf9	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	12ad3d00-0f34-4e43-9996-da778e08890d	2026-02-19 00:17:32.221394+00
0750bafe-e9d8-43e8-8c29-d3c0f6e0f37b	7ed89d96-423f-4177-9197-0dc553f6f4a4	b3424df5-f66f-49a6-8e93-3593c9df5f13	2026-02-19 01:35:01.088246+00
b525e98a-7519-4ccd-9b28-52ad909b8e1d	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	2026-02-19 15:27:43.951926+00
\.


--
-- Data for Name: classes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classes (id, teacher_id, name, grade_band, join_code, created_at) FROM stdin;
1bda6cea-15dd-4f18-8d46-2d79ec4ac19f	teacher-ui-test2	六年级一班	primary	DKESDP	2026-02-18 14:55:06.469229+00
a875ed61-0b54-4cd8-85fe-394fc701c278	teacher-9e4cb76a	三年级一班	primary	6KW1KP	2026-02-18 15:53:42.923407+00
3b2f0730-6dec-4ed1-b617-30c0b1d105e9	e2d4bfd6-86e1-4856-9815-7bf8f20ff81d	六年级一班	primary	C44KVW	2026-02-18 16:08:57.010189+00
a28a1afb-6142-4eed-af22-e780afd1447b	2d8e66f3-e30c-4fd2-90fd-9511c542a613	三年级一班	primary	3PRIRE	2026-02-18 16:22:48.040665+00
2c823aab-d0c4-4134-86ed-bdc3edda726f	ae901c86-7c11-4a2b-bc80-e6983b65633b	联调班级	primary	UQ0GVU	2026-02-18 16:24:44.365122+00
8ec3cd67-a088-4e91-b406-51825e734a11	b992bf0a-1785-4b27-b091-27b6cca78b6f	联调班级	primary	5KXYSR	2026-02-18 17:05:07.834538+00
9fbd08a5-22d1-4c69-92de-c0d5192a6586	2d2728c3-853d-4d74-a478-e223d22acb0d	评审联调班	primary	F0PE21	2026-02-18 23:57:49.622945+00
9906134c-f087-412b-b91a-34a8e5586567	dae68038-3354-45e6-84e7-9a04ac433da1	汇总班级	primary	9CWPYP	2026-02-19 00:06:58.881937+00
3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	c17b1177-4f8d-4687-b911-9f2394326859	段落班级	primary	X7K535	2026-02-19 00:17:31.918522+00
94c33227-34f6-45d8-92b8-8dfe6354861f	fb7f7202-a25d-49ea-a42f-235ff94c0d8e	账号授权班级	primary	3V9HAL	2026-02-19 00:30:50.140596+00
7ed89d96-423f-4177-9197-0dc553f6f4a4	38689f2e-7826-4332-9b2e-cea631c7e27e	桃子老师作文课	primary	O71NK4	2026-02-19 01:33:50.562398+00
054b80e1-b212-480c-b544-a42940181c0f	12d977bb-2de5-4827-8daf-8be630d31a4a	桃子老师的小学作文课	primary	LMQECA	2026-02-19 15:26:21.365808+00
8237e008-faaa-49ac-81dd-d91c681c6adc	12d977bb-2de5-4827-8daf-8be630d31a4a	桃子老师的小学作文课2	primary	N5I16L	2026-02-19 15:26:36.593795+00
\.


--
-- Data for Name: manual_feedback_receipts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manual_feedback_receipts (id, manual_review_id, submission_id, student_id, first_viewed_at, last_viewed_at, view_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: manual_review_replies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manual_review_replies (id, manual_review_id, submission_id, assignment_id, class_id, student_id, teacher_id, author_role, author_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: manual_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.manual_reviews (id, submission_id, assignment_id, class_id, teacher_id, student_id, structure_score, language_score, value_score, total_score, summary_feedback, actionable_suggestions, strengths, next_goal, status, version, created_at, updated_at, published_at) FROM stdin;
b5c7ee24-03f2-4998-a49b-32a87ba0b784	b57fea3d-4d5d-4141-9f01-916df1962289	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	12d977bb-2de5-4827-8daf-8be630d31a4a	6587f385-626c-41d1-9eb4-eaf6f6e62725	80	80	80	80	写的不错。	["\\u8865\\u5145\\u4e00\\u4e2a\\u5177\\u4f53\\u573a\\u666f\\u7ec6\\u8282\\u3002", "\\u7ed3\\u5c3e\\u589e\\u52a0\\u4e00\\u53e5\\u53cd\\u601d\\u3002"]	\N	\N	published	2	2026-02-19 15:30:47.720619+00	2026-02-19 15:30:47.885217+00	2026-02-19 15:30:47.885217+00
\.


--
-- Data for Name: student_memory_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.student_memory_notes (id, student_id, teacher_id, class_id, source_submission_id, source_review_id, agent_name, note, tags, status, created_at) FROM stdin;
d713a0c2-52e6-41ac-98ef-d7ee9ec6150a	1d05ff41-efb3-4456-bf32-0dfe18ddb499	2d2728c3-853d-4d74-a478-e223d22acb0d	9fbd08a5-22d1-4c69-92de-c0d5192a6586	def41074-20af-464f-9abb-188d323592d9	a1a72997-dae1-46a2-a6a5-355ddb9d461d	language	语言表现稳定，长期建议积累高频好词并减少重复句式。	agent:language,score:81	active	2026-02-18 23:57:50.082413+00
ecf28afc-9b16-437d-b705-3ce5f121a2b2	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	9906134c-f087-412b-b91a-34a8e5586567	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	a2db9204-9f28-4b35-8ec0-f7debf28f227	structure	结构聚焦主题，后续优先补强过渡句和段间衔接。	agent:structure,score:79	active	2026-02-19 00:06:59.345697+00
cdbc0940-25b8-4986-b38a-c9e31386e45a	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	9906134c-f087-412b-b91a-34a8e5586567	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	4367590e-2a50-44a4-a472-5e4320686852	language	语言表现稳定，长期建议积累高频好词并减少重复句式。	agent:language,score:81	active	2026-02-19 00:06:59.356244+00
d10f7c5e-2bb6-456c-acae-f3f13af6f7b8	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	9906134c-f087-412b-b91a-34a8e5586567	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	d9ad81b3-c750-443c-b650-2f8b6102e20c	value	立意基础良好，后续重点培养“观点-事例-反思”三段式表达。	agent:value,score:83	active	2026-02-19 00:06:59.360673+00
4aff9f7c-7a59-4d9c-a6f2-f9cffda44a65	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	0c5aa1af-1da5-4982-a7b8-d6891013e7c7	structure	结构聚焦主题，后续优先补强过渡句和段间衔接。	agent:structure,score:79	active	2026-02-19 00:17:32.329096+00
0800fac8-2b4e-424a-a8c9-5653c405cbf0	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	8a8f0336-ac81-4532-8ddd-08eb28d81525	language	语言表现稳定，长期建议积累高频好词并减少重复句式。	agent:language,score:81	active	2026-02-19 00:17:32.341086+00
c10ab54e-6854-49c9-ab35-b6a9ffd93f4b	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	3d80d7f5-edd3-4f6a-a6ec-349bf7c30873	value	立意基础良好，后续重点培养“观点-事例-反思”三段式表达。	agent:value,score:83	active	2026-02-19 00:17:32.345448+00
138e3052-2969-446d-b198-acc5190da507	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	054b80e1-b212-480c-b544-a42940181c0f	b57fea3d-4d5d-4141-9f01-916df1962289	643ba2d4-e23d-4447-a5dc-0a0c83dc871a	language	语言表现稳定，长期建议积累高频好词并减少重复句式。	agent:language,score:80	active	2026-02-19 15:30:06.965343+00
4ee64b50-829c-4a39-8693-622c1efe3647	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	054b80e1-b212-480c-b544-a42940181c0f	b57fea3d-4d5d-4141-9f01-916df1962289	5f030715-178e-4fac-8221-57f23dda7122	structure	结构聚焦主题，后续优先补强过渡句和段间衔接。	agent:structure,score:78	active	2026-02-19 15:31:49.890724+00
a448a760-6902-4824-9b01-a84682a4152b	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	054b80e1-b212-480c-b544-a42940181c0f	b57fea3d-4d5d-4141-9f01-916df1962289	0d8b67ce-5fde-49e9-9baa-e98e2a0ea56a	value	立意基础良好，后续重点培养“观点-事例-反思”三段式表达。	agent:value,score:82	active	2026-02-19 15:31:49.916023+00
\.


--
-- Data for Name: submission_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submission_reviews (id, submission_id, assignment_id, class_id, student_id, teacher_id, agent_name, score, feedback, status, created_at) FROM stdin;
a1a72997-dae1-46a2-a6a5-355ddb9d461d	def41074-20af-464f-9abb-188d323592d9	24538bca-416a-48de-b9ff-00800561aecf	9fbd08a5-22d1-4c69-92de-c0d5192a6586	1d05ff41-efb3-4456-bf32-0dfe18ddb499	2d2728c3-853d-4d74-a478-e223d22acb0d	language	81	语言评审：表达较自然，建议结合题目“描写深秋校园的一角”增加更具体的动词与细节描写。	completed	2026-02-18 23:57:50.077711+00
a2db9204-9f28-4b35-8ec0-f7debf28f227	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	19623adf-dc2b-4a16-8a53-a6209f3f640b	9906134c-f087-412b-b91a-34a8e5586567	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	structure	79	结构评审：围绕《初冬》中心表达清晰，建议增加首尾呼应与段落层次。	completed	2026-02-19 00:06:59.344043+00
4367590e-2a50-44a4-a472-5e4320686852	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	19623adf-dc2b-4a16-8a53-a6209f3f640b	9906134c-f087-412b-b91a-34a8e5586567	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	language	81	语言评审：表达较自然，建议围绕“描写初冬清晨”增加动词与细节描写。	completed	2026-02-19 00:06:59.355589+00
d9ad81b3-c750-443c-b650-2f8b6102e20c	4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	19623adf-dc2b-4a16-8a53-a6209f3f640b	9906134c-f087-412b-b91a-34a8e5586567	bb97a531-3b2d-42ab-8417-d33656b3f1fe	dae68038-3354-45e6-84e7-9a04ac433da1	value	83	立意评审：情感方向积极，建议在观点后补一处具体事例增强说服力。	completed	2026-02-19 00:06:59.360133+00
0c5aa1af-1da5-4982-a7b8-d6891013e7c7	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	75f5ae05-3a0f-4844-861f-1b717c9aff60	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	structure	79	结构评审：围绕《雨后》中心表达清晰，建议增加首尾呼应与段落层次。	completed	2026-02-19 00:17:32.326565+00
8a8f0336-ac81-4532-8ddd-08eb28d81525	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	75f5ae05-3a0f-4844-861f-1b717c9aff60	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	language	81	语言评审：表达较自然，建议围绕“描写雨后校园”增加动词与细节描写。	completed	2026-02-19 00:17:32.3404+00
3d80d7f5-edd3-4f6a-a6ec-349bf7c30873	984c396e-8e3e-41c9-a60b-a8b6ee4ec800	75f5ae05-3a0f-4844-861f-1b717c9aff60	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	12ad3d00-0f34-4e43-9996-da778e08890d	c17b1177-4f8d-4687-b911-9f2394326859	value	83	立意评审：情感方向积极，建议在观点后补一处具体事例增强说服力。	completed	2026-02-19 00:17:32.344954+00
643ba2d4-e23d-4447-a5dc-0a0c83dc871a	b57fea3d-4d5d-4141-9f01-916df1962289	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	language	80	语言评审：表达较自然，建议围绕“请写一篇介绍家乡景色与人情的作文”增加动词与细节描写。	completed	2026-02-19 15:30:06.958243+00
5f030715-178e-4fac-8221-57f23dda7122	b57fea3d-4d5d-4141-9f01-916df1962289	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	structure	78	结构评审：围绕《我的家乡》中心表达清晰，建议增加首尾呼应与段落层次。	completed	2026-02-19 15:31:49.887693+00
0d8b67ce-5fde-49e9-9baa-e98e2a0ea56a	b57fea3d-4d5d-4141-9f01-916df1962289	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	12d977bb-2de5-4827-8daf-8be630d31a4a	value	82	立意评审：情感方向积极，建议在观点后补一处具体事例增强说服力。	completed	2026-02-19 15:31:49.913084+00
\.


--
-- Data for Name: submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.submissions (id, assignment_id, class_id, student_id, content_type, text_content, file_name, file_url, storage_provider, status, created_at) FROM stdin;
53a59f25-faec-49dc-9ce1-b3d9e7036019	d3e41de5-44d7-4c72-b411-b8cc1a1baee2	8ec3cd67-a088-4e91-b406-51825e734a11	fcd2a518-bdb3-4938-a0a1-faecd1bda1b2	text	今天我在校园里看到了第一朵迎春花。	\N	\N	local	submitted	2026-02-18 17:05:08.210784+00
3af65e97-0dbe-4a6b-bcec-b9bb16429acb	d3e41de5-44d7-4c72-b411-b8cc1a1baee2	8ec3cd67-a088-4e91-b406-51825e734a11	fcd2a518-bdb3-4938-a0a1-faecd1bda1b2	document	\N	ce_mock.docx	/storage/uploads/8ec3cd67-a088-4e91-b406-51825e734a11/d3e41de5-44d7-4c72-b411-b8cc1a1baee2/fcd2a518-bdb3-4938-a0a1-faecd1bda1b2/339639f8680f4ff1a4ee68cdacb5f553.docx	local	submitted	2026-02-18 17:05:08.287591+00
def41074-20af-464f-9abb-188d323592d9	24538bca-416a-48de-b9ff-00800561aecf	9fbd08a5-22d1-4c69-92de-c0d5192a6586	1d05ff41-efb3-4456-bf32-0dfe18ddb499	text	深秋的风从操场边吹过，树叶像小船一样慢慢落下。	\N	\N	local	submitted	2026-02-18 23:57:49.996117+00
4fcb9d7b-bc52-42c1-a55c-1127d2b671dd	19623adf-dc2b-4a16-8a53-a6209f3f640b	9906134c-f087-412b-b91a-34a8e5586567	bb97a531-3b2d-42ab-8417-d33656b3f1fe	text	初冬的清晨，操场边的草叶挂着细小露珠。	\N	\N	local	submitted	2026-02-19 00:06:59.273276+00
984c396e-8e3e-41c9-a60b-a8b6ee4ec800	75f5ae05-3a0f-4844-861f-1b717c9aff60	3cb5930e-c1f0-49c1-aaf4-b21782fcbaa5	12ad3d00-0f34-4e43-9996-da778e08890d	text	雨后操场有湿润的青草味，我听见远处传来清脆的上课铃声。	\N	\N	local	submitted	2026-02-19 00:17:32.23903+00
b57fea3d-4d5d-4141-9f01-916df1962289	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	text	今天我在校园里看到了第一朵迎春花。	\N	\N	local	submitted	2026-02-19 15:27:52.405928+00
fe3c7619-1006-40fa-a7cd-fa1d5b3a38dc	644bd53a-4234-4586-823d-69dd995c298f	054b80e1-b212-480c-b544-a42940181c0f	6587f385-626c-41d1-9eb4-eaf6f6e62725	image	\N	jiangnan-portrait (1).png	/storage/uploads/054b80e1-b212-480c-b544-a42940181c0f/644bd53a-4234-4586-823d-69dd995c298f/6587f385-626c-41d1-9eb4-eaf6f6e62725/acb37f0128b943fb8038fcd4186b4a2f.png	local	submitted	2026-02-19 16:26:31.439027+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, role, phone, display_name, created_at, student_profile_completed_at, teacher_profile_completed_at) FROM stdin;
teacher-ui-test2	teacher	\N	王老师	2026-02-18 14:55:06.462024+00	\N	\N
student-ui-test2	student	\N	小明	2026-02-18 14:55:06.557872+00	\N	\N
teacher-9e4cb76a	teacher	\N	王老师	2026-02-18 15:53:42.916967+00	\N	\N
e2d4bfd6-86e1-4856-9815-7bf8f20ff81d	teacher	13811112222	王老师	2026-02-18 16:08:56.665851+00	\N	\N
cb4f69e8-4625-4f26-8c43-7fa1897ac2af	student	13811113333	小明	2026-02-18 16:08:57.143838+00	\N	\N
2d8e66f3-e30c-4fd2-90fd-9511c542a613	teacher	13800138000	王老师	2026-02-18 16:22:05.847036+00	\N	\N
a78619fb-6301-4264-aabc-21564bb38cf7	teacher	13871431842	联调老师	2026-02-18 16:24:02.94988+00	\N	\N
560e271e-f0b5-44fe-b7c6-957630433c20	teacher	13871431852	联调老师	2026-02-18 16:24:12.453031+00	\N	\N
2e9fd855-ef5f-4272-8f7e-8dd65899550b	teacher	13871431864	联调老师	2026-02-18 16:24:24.944349+00	\N	\N
ae901c86-7c11-4a2b-bc80-e6983b65633b	teacher	13871431883	联调老师	2026-02-18 16:24:44.237413+00	\N	\N
b992bf0a-1785-4b27-b091-27b6cca78b6f	teacher	13871434299	联调老师	2026-02-18 17:05:07.576607+00	\N	\N
fcd2a518-bdb3-4938-a0a1-faecd1bda1b2	student	13971434299	联调学生	2026-02-18 17:05:08.020745+00	\N	\N
2d2728c3-853d-4d74-a478-e223d22acb0d	teacher	13771459059	评审老师	2026-02-18 23:57:49.37945+00	\N	\N
1d05ff41-efb3-4456-bf32-0dfe18ddb499	student	13671459059	评审学生	2026-02-18 23:57:49.8555+00	\N	\N
dae68038-3354-45e6-84e7-9a04ac433da1	teacher	13571459610	汇总老师	2026-02-19 00:06:58.641889+00	\N	\N
bb97a531-3b2d-42ab-8417-d33656b3f1fe	student	13471459610	轨迹学生	2026-02-19 00:06:59.103035+00	\N	\N
c17b1177-4f8d-4687-b911-9f2394326859	teacher	13371460251	段落老师	2026-02-19 00:17:31.685239+00	\N	\N
12ad3d00-0f34-4e43-9996-da778e08890d	student	13271460251	段落学生	2026-02-19 00:17:32.125653+00	\N	\N
fb7f7202-a25d-49ea-a42f-235ff94c0d8e	teacher	13149314575	GitHub方案老师	2026-02-19 00:30:49.869641+00	\N	\N
53f75d59-4d30-40ac-a811-9ddaaff8625a	student	13049395573	短信学生	2026-02-19 00:30:50.167677+00	\N	\N
846eef8e-8917-40bc-8e52-2d8e5442c688	student	\N	Debug User	2026-02-19 01:29:48.529564+00	\N	\N
38689f2e-7826-4332-9b2e-cea631c7e27e	teacher	13270998191	祝老师	2026-02-19 01:33:27.660173+00	\N	\N
b3424df5-f66f-49a6-8e93-3593c9df5f13	student	18550586292	伊森	2026-02-19 01:34:55.532865+00	\N	\N
ef54c95d-3cbd-4606-8492-bcbdcb38edc6	student	\N	学生A	2026-02-19 01:47:37.688294+00	\N	\N
098d4a18-ac8b-462b-bc59-9d81ce476d30	teacher	13971465688	任意老师	2026-02-19 01:48:08.999328+00	\N	\N
69f90b52-9259-4c90-8c7e-0fa3ab50def0	teacher	\N	短信老师	2026-02-19 03:58:20.502989+00	\N	\N
70f82213-d3cb-4295-a475-d9a0c09b5742	student	\N	学生	2026-02-19 03:58:20.654113+00	\N	\N
9344d16f-01cc-4733-89bb-8f8d626a7a4d	teacher	1371473520844	短信老师	2026-02-19 03:58:40.760001+00	\N	\N
02512eb3-9ea7-485f-8704-aa0c4fdec66b	teacher	\N	调试老师	2026-02-19 14:41:58.558843+00	\N	\N
a137ea96-d0ec-4b36-9abd-c1577ba5e56a	teacher	13800001111	老师A	2026-02-19 14:42:20.042984+00	\N	\N
394dbefa-6949-485b-b769-f074a3be52cf	teacher	\N	代理老师	2026-02-19 14:42:37.24393+00	\N	\N
773ee5fe-fbf0-4895-aeef-059af258ef0a	teacher	13812344321	代理老师	2026-02-19 14:42:47.314095+00	\N	\N
8232c1ac-67ac-4cd5-b12d-73483d63c99e	teacher	13800013767	在线老师	2026-02-19 14:55:17.874732+00	\N	\N
7d633305-53a0-4974-a57b-993d8edc7887	teacher	13800013768	在线老师	2026-02-19 14:55:33.304394+00	\N	\N
12d977bb-2de5-4827-8daf-8be630d31a4a	teacher	\N	祝老师	2026-02-19 15:25:58.63002+00	\N	\N
6587f385-626c-41d1-9eb4-eaf6f6e62725	student	\N	伊森	2026-02-19 15:27:37.556555+00	\N	\N
\.


--
-- Data for Name: ux_event_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ux_event_logs (id, user_id, role, event_name, event_category, page, properties_json, created_at) FROM stdin;
\.


--
-- Data for Name: wechat_account_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wechat_account_links (id, auth_account_id, unionid, openid, nickname, avatar_url, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wechat_bind_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wechat_bind_sessions (ticket, role, unionid, openid, nickname, avatar_url, next_path, expires_at, consumed_at, created_at) FROM stdin;
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: assignment_reminders assignment_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_reminders
    ADD CONSTRAINT assignment_reminders_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: auth_account_roles auth_account_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_account_roles
    ADD CONSTRAINT auth_account_roles_pkey PRIMARY KEY (auth_account_id, role);


--
-- Name: auth_accounts auth_accounts_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_phone_key UNIQUE (phone);


--
-- Name: auth_accounts auth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);


--
-- Name: class_members class_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_pkey PRIMARY KEY (id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: manual_feedback_receipts manual_feedback_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_feedback_receipts
    ADD CONSTRAINT manual_feedback_receipts_pkey PRIMARY KEY (id);


--
-- Name: manual_review_replies manual_review_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_pkey PRIMARY KEY (id);


--
-- Name: manual_reviews manual_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_pkey PRIMARY KEY (id);


--
-- Name: student_memory_notes student_memory_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_pkey PRIMARY KEY (id);


--
-- Name: submission_reviews submission_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_pkey PRIMARY KEY (id);


--
-- Name: submissions submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_pkey PRIMARY KEY (id);


--
-- Name: class_members uq_class_members_class_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT uq_class_members_class_student UNIQUE (class_id, student_id);


--
-- Name: manual_feedback_receipts uq_manual_feedback_receipt_submission_student; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_feedback_receipts
    ADD CONSTRAINT uq_manual_feedback_receipt_submission_student UNIQUE (submission_id, student_id);


--
-- Name: manual_reviews uq_manual_reviews_submission_teacher; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT uq_manual_reviews_submission_teacher UNIQUE (submission_id, teacher_id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ux_event_logs ux_event_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ux_event_logs
    ADD CONSTRAINT ux_event_logs_pkey PRIMARY KEY (id);


--
-- Name: wechat_account_links wechat_account_links_auth_account_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_account_links
    ADD CONSTRAINT wechat_account_links_auth_account_id_key UNIQUE (auth_account_id);


--
-- Name: wechat_account_links wechat_account_links_openid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_account_links
    ADD CONSTRAINT wechat_account_links_openid_key UNIQUE (openid);


--
-- Name: wechat_account_links wechat_account_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_account_links
    ADD CONSTRAINT wechat_account_links_pkey PRIMARY KEY (id);


--
-- Name: wechat_account_links wechat_account_links_unionid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_account_links
    ADD CONSTRAINT wechat_account_links_unionid_key UNIQUE (unionid);


--
-- Name: wechat_bind_sessions wechat_bind_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_bind_sessions
    ADD CONSTRAINT wechat_bind_sessions_pkey PRIMARY KEY (ticket);


--
-- Name: ix_assignment_reminders_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_assignment_reminders_assignment_id ON public.assignment_reminders USING btree (assignment_id);


--
-- Name: ix_assignment_reminders_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_assignment_reminders_class_id ON public.assignment_reminders USING btree (class_id);


--
-- Name: ix_assignment_reminders_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_assignment_reminders_teacher_id ON public.assignment_reminders USING btree (teacher_id);


--
-- Name: ix_assignments_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_assignments_class_id ON public.assignments USING btree (class_id);


--
-- Name: ix_assignments_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_assignments_teacher_id ON public.assignments USING btree (teacher_id);


--
-- Name: ix_auth_account_roles_auth_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_auth_account_roles_auth_account_id ON public.auth_account_roles USING btree (auth_account_id);


--
-- Name: ix_auth_accounts_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_auth_accounts_email ON public.auth_accounts USING btree (email);


--
-- Name: ix_class_members_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_class_members_class_id ON public.class_members USING btree (class_id);


--
-- Name: ix_class_members_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_class_members_student_id ON public.class_members USING btree (student_id);


--
-- Name: ix_classes_join_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_classes_join_code ON public.classes USING btree (join_code);


--
-- Name: ix_classes_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_classes_teacher_id ON public.classes USING btree (teacher_id);


--
-- Name: ix_manual_feedback_receipts_manual_review_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_feedback_receipts_manual_review_id ON public.manual_feedback_receipts USING btree (manual_review_id);


--
-- Name: ix_manual_feedback_receipts_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_feedback_receipts_student_id ON public.manual_feedback_receipts USING btree (student_id);


--
-- Name: ix_manual_feedback_receipts_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_feedback_receipts_submission_id ON public.manual_feedback_receipts USING btree (submission_id);


--
-- Name: ix_manual_review_replies_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_assignment_id ON public.manual_review_replies USING btree (assignment_id);


--
-- Name: ix_manual_review_replies_author_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_author_id ON public.manual_review_replies USING btree (author_id);


--
-- Name: ix_manual_review_replies_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_class_id ON public.manual_review_replies USING btree (class_id);


--
-- Name: ix_manual_review_replies_manual_review_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_manual_review_id ON public.manual_review_replies USING btree (manual_review_id);


--
-- Name: ix_manual_review_replies_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_student_id ON public.manual_review_replies USING btree (student_id);


--
-- Name: ix_manual_review_replies_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_submission_id ON public.manual_review_replies USING btree (submission_id);


--
-- Name: ix_manual_review_replies_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_review_replies_teacher_id ON public.manual_review_replies USING btree (teacher_id);


--
-- Name: ix_manual_reviews_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_reviews_assignment_id ON public.manual_reviews USING btree (assignment_id);


--
-- Name: ix_manual_reviews_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_reviews_class_id ON public.manual_reviews USING btree (class_id);


--
-- Name: ix_manual_reviews_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_reviews_student_id ON public.manual_reviews USING btree (student_id);


--
-- Name: ix_manual_reviews_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_reviews_submission_id ON public.manual_reviews USING btree (submission_id);


--
-- Name: ix_manual_reviews_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_manual_reviews_teacher_id ON public.manual_reviews USING btree (teacher_id);


--
-- Name: ix_student_memory_notes_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_student_memory_notes_class_id ON public.student_memory_notes USING btree (class_id);


--
-- Name: ix_student_memory_notes_source_review_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_student_memory_notes_source_review_id ON public.student_memory_notes USING btree (source_review_id);


--
-- Name: ix_student_memory_notes_source_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_student_memory_notes_source_submission_id ON public.student_memory_notes USING btree (source_submission_id);


--
-- Name: ix_student_memory_notes_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_student_memory_notes_student_id ON public.student_memory_notes USING btree (student_id);


--
-- Name: ix_student_memory_notes_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_student_memory_notes_teacher_id ON public.student_memory_notes USING btree (teacher_id);


--
-- Name: ix_submission_reviews_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submission_reviews_assignment_id ON public.submission_reviews USING btree (assignment_id);


--
-- Name: ix_submission_reviews_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submission_reviews_class_id ON public.submission_reviews USING btree (class_id);


--
-- Name: ix_submission_reviews_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submission_reviews_student_id ON public.submission_reviews USING btree (student_id);


--
-- Name: ix_submission_reviews_submission_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submission_reviews_submission_id ON public.submission_reviews USING btree (submission_id);


--
-- Name: ix_submission_reviews_teacher_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submission_reviews_teacher_id ON public.submission_reviews USING btree (teacher_id);


--
-- Name: ix_submissions_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submissions_assignment_id ON public.submissions USING btree (assignment_id);


--
-- Name: ix_submissions_class_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submissions_class_id ON public.submissions USING btree (class_id);


--
-- Name: ix_submissions_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_submissions_student_id ON public.submissions USING btree (student_id);


--
-- Name: ix_ux_event_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_created_at ON public.ux_event_logs USING btree (created_at);


--
-- Name: ix_ux_event_logs_event_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_event_category ON public.ux_event_logs USING btree (event_category);


--
-- Name: ix_ux_event_logs_event_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_event_name ON public.ux_event_logs USING btree (event_name);


--
-- Name: ix_ux_event_logs_page; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_page ON public.ux_event_logs USING btree (page);


--
-- Name: ix_ux_event_logs_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_role ON public.ux_event_logs USING btree (role);


--
-- Name: ix_ux_event_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_ux_event_logs_user_id ON public.ux_event_logs USING btree (user_id);


--
-- Name: ix_wechat_account_links_auth_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_wechat_account_links_auth_account_id ON public.wechat_account_links USING btree (auth_account_id);


--
-- Name: ix_wechat_account_links_openid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_wechat_account_links_openid ON public.wechat_account_links USING btree (openid);


--
-- Name: ix_wechat_account_links_unionid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_wechat_account_links_unionid ON public.wechat_account_links USING btree (unionid);


--
-- Name: ix_wechat_bind_sessions_consumed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_wechat_bind_sessions_consumed_at ON public.wechat_bind_sessions USING btree (consumed_at);


--
-- Name: ix_wechat_bind_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_wechat_bind_sessions_expires_at ON public.wechat_bind_sessions USING btree (expires_at);


--
-- Name: ix_wechat_bind_sessions_openid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_wechat_bind_sessions_openid ON public.wechat_bind_sessions USING btree (openid);


--
-- Name: ix_wechat_bind_sessions_unionid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_wechat_bind_sessions_unionid ON public.wechat_bind_sessions USING btree (unionid);


--
-- Name: assignment_reminders assignment_reminders_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_reminders
    ADD CONSTRAINT assignment_reminders_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: assignment_reminders assignment_reminders_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_reminders
    ADD CONSTRAINT assignment_reminders_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: assignment_reminders assignment_reminders_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_reminders
    ADD CONSTRAINT assignment_reminders_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: assignments assignments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: assignments assignments_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: auth_account_roles auth_account_roles_auth_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_account_roles
    ADD CONSTRAINT auth_account_roles_auth_account_id_fkey FOREIGN KEY (auth_account_id) REFERENCES public.auth_accounts(id);


--
-- Name: class_members class_members_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: class_members class_members_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class_members
    ADD CONSTRAINT class_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: classes classes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: manual_feedback_receipts manual_feedback_receipts_manual_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_feedback_receipts
    ADD CONSTRAINT manual_feedback_receipts_manual_review_id_fkey FOREIGN KEY (manual_review_id) REFERENCES public.manual_reviews(id);


--
-- Name: manual_feedback_receipts manual_feedback_receipts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_feedback_receipts
    ADD CONSTRAINT manual_feedback_receipts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: manual_feedback_receipts manual_feedback_receipts_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_feedback_receipts
    ADD CONSTRAINT manual_feedback_receipts_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id);


--
-- Name: manual_review_replies manual_review_replies_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: manual_review_replies manual_review_replies_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: manual_review_replies manual_review_replies_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: manual_review_replies manual_review_replies_manual_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_manual_review_id_fkey FOREIGN KEY (manual_review_id) REFERENCES public.manual_reviews(id);


--
-- Name: manual_review_replies manual_review_replies_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: manual_review_replies manual_review_replies_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id);


--
-- Name: manual_review_replies manual_review_replies_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_review_replies
    ADD CONSTRAINT manual_review_replies_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: manual_reviews manual_reviews_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: manual_reviews manual_reviews_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: manual_reviews manual_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: manual_reviews manual_reviews_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id);


--
-- Name: manual_reviews manual_reviews_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.manual_reviews
    ADD CONSTRAINT manual_reviews_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: student_memory_notes student_memory_notes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: student_memory_notes student_memory_notes_source_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_source_review_id_fkey FOREIGN KEY (source_review_id) REFERENCES public.submission_reviews(id);


--
-- Name: student_memory_notes student_memory_notes_source_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_source_submission_id_fkey FOREIGN KEY (source_submission_id) REFERENCES public.submissions(id);


--
-- Name: student_memory_notes student_memory_notes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: student_memory_notes student_memory_notes_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_memory_notes
    ADD CONSTRAINT student_memory_notes_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: submission_reviews submission_reviews_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: submission_reviews submission_reviews_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: submission_reviews submission_reviews_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: submission_reviews submission_reviews_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id);


--
-- Name: submission_reviews submission_reviews_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submission_reviews
    ADD CONSTRAINT submission_reviews_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id);


--
-- Name: submissions submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id);


--
-- Name: submissions submissions_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);


--
-- Name: submissions submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.submissions
    ADD CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: ux_event_logs ux_event_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ux_event_logs
    ADD CONSTRAINT ux_event_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: wechat_account_links wechat_account_links_auth_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wechat_account_links
    ADD CONSTRAINT wechat_account_links_auth_account_id_fkey FOREIGN KEY (auth_account_id) REFERENCES public.auth_accounts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict z6jQqf2te7Jf9iNB8JfyedVfRO6hVuynniZy6ZAMiFJrgZNhalsn3D0gTZ4BDC0

