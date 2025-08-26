--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.5 (Homebrew)

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
-- Data for Name: ai_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_api_keys (id, provider, label, api_key_enc, active, priority, success_count, error_count, last_used_at, created_at, updated_at) FROM stdin;
7	llamaparse	Primary	ZIMUriZ6QQwidANE.hPQlhk9utRx9l7CSW/kTGjLcayVCEBCWkXNHZG7aU2PDJi5BJNV0wNMOW8tuYL9HBWOIzA==.9xZQQRBv/kkUWkIDVFjAhA==	t	1	0	0	\N	2025-08-19 02:05:31.989+05:30	2025-08-19 02:05:31.989+05:30
8	llamaparse	Secondary Key	ORKdPUWxI59CF1O+.7bqQdX0PKfzgY615gakpempJUSQ8uB9IkNrfshU8MhBVXss1IeuMuXQ4K1kTc00kP6b5/w==.eqUDWjVJJ9lrDc3O15gbXw==	t	2	3	0	2025-08-19 16:01:05.017+05:30	2025-08-19 02:11:25.796+05:30	2025-08-19 16:01:05.021+05:30
1	gemini	Primary Key	m8cwgNMoGqvOk0z4.8zHZH3AArRnsrIcnF/XCs0usZuKeTaAE6pKEUOIDVt94dn950Zie.bU9hDdoLqfuBbyOxZiRuGw==	t	0	60	0	2025-08-22 19:19:24.171+05:30	2025-08-17 21:06:34.934+05:30	2025-08-22 19:19:24.173+05:30
\.


--
-- Data for Name: ai_models; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ai_models (id, provider, name, label, active, priority, created_at, updated_at) FROM stdin;
2	gemini	gemini-2.5-flash	Gemini Flash 2.5	t	2	2025-08-17 20:20:35.815+05:30	2025-08-17 20:26:01.165+05:30
\.


--
-- Name: ai_api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_api_keys_id_seq', 8, true);


--
-- Name: ai_models_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.ai_models_id_seq', 13, true);


--
-- PostgreSQL database dump complete
--

