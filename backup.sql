--
-- PostgreSQL database dump
--

\restrict qSV8xrmfW9rMlBrdlFSTb8WamRbAIkrNA03l2EEPQxiRtVPJVj2H4Puw2mDchpQ

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 18.2

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_content (
    id integer NOT NULL,
    title text,
    prompt text NOT NULL,
    output text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by integer,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    platform text DEFAULT 'instagram'::text NOT NULL,
    hashtags text DEFAULT ''::text NOT NULL
);


--
-- Name: ai_content_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_content_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_content_id_seq OWNED BY public.ai_content.id;


--
-- Name: campaign_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_content (
    campaign_id integer NOT NULL,
    content_id integer NOT NULL
);


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'planned'::text NOT NULL,
    start_date date,
    end_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    low_stock_threshold integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'Skincare'::text NOT NULL,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    description text DEFAULT ''::text NOT NULL
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id integer NOT NULL,
    sale_id integer NOT NULL,
    product_id integer NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    CONSTRAINT sale_items_qty_check CHECK ((qty > 0))
);


--
-- Name: sale_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sale_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_items_id_seq OWNED BY public.sale_items.id;


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id integer NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    customer_name text,
    staff_name text,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    discount_type text,
    discount_value numeric(10,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0 NOT NULL
);


--
-- Name: sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_id_seq OWNED BY public.sales.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    clerk_id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'staff'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: ai_content id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content ALTER COLUMN id SET DEFAULT nextval('public.ai_content_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: sale_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items ALTER COLUMN id SET DEFAULT nextval('public.sale_items_id_seq'::regclass);


--
-- Name: sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales ALTER COLUMN id SET DEFAULT nextval('public.sales_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: ai_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_content (id, title, prompt, output, status, created_by, approved_by, approved_at, created_at, platform, hashtags) FROM stdin;
1	\N	Write a summer promo	Hot deals this summer!	approved	\N	\N	2026-03-07 07:53:25.464528+00	2026-03-07 07:50:50.68909+00	instagram	
5	Pearl Brightening Cream — caption (professional)	caption for Pearl Brightening Cream — tone: professional	Introducing Pearl Brightening Cream. Expertly formulated to deliver visible results from day one. Priced at ₱62.99, it's your next essential beauty investment.	rejected	\N	\N	2026-03-07 12:07:14.328993+00	2026-03-07 11:56:31.44096+00	facebook	#PearlBrighteningCream #BellahBeatrix #BeautyShop #PhilippineBeauty #LocalBrand #SkincarePH
4	test1	story for Golden Hour Highlighter — tone: fun	POV: You just discovered Golden Hour Highlighter and your skincare game will never be the same again ✨ 💕 Available now for ₱28.99! Swipe up to shop! 🎉	approved	\N	\N	2026-03-07 12:07:58.94022+00	2026-03-07 11:51:51.846671+00	facebook	#GoldenHourHighlighter #BellahBeatrix #BeautyShop #PhilippineBeauty #LocalBrand #SkincarePH
3	burat	story for Rose Glow Serum — tone: professional	Today we're sharing the story behind Rose Glow Serum. Developed after months of research, this product was designed to solve real beauty challenges. Available at ₱45.99.	approved	\N	\N	2026-03-07 12:08:05.435806+00	2026-03-07 11:50:57.717662+00	facebook	#RoseGlowSerum #BellahBeatrix #BeautyShop #PhilippineBeauty #LocalBrand #SkincarePH
2	\N	test from postman	test output	approved	\N	\N	2026-03-07 12:08:32.404334+00	2026-03-07 11:33:36.870135+00	instagram	
6	Pearl Brightening Cream — story (fun)	story for Pearl Brightening Cream — tone: fun	POV: You just discovered Pearl Brightening Cream and your skincare game will never be the same again ✨ 💕 Available now for ₱62.99! Swipe up to shop! 🎉	approved	\N	\N	2026-03-07 12:09:10.684427+00	2026-03-07 12:09:00.885171+00	instagram	#PearlBrighteningCream #BellahBeatrix #BeautyGram #SkincareRoutine #GlowUp #MakeupLover #BeautyTips
\.


--
-- Data for Name: campaign_content; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.campaign_content (campaign_id, content_id) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.campaigns (id, name, status, start_date, end_date, created_at) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, sku, name, price, stock, low_stock_threshold, created_at, updated_at, category, cost, description) FROM stdin;
4	SKU-003	burat1	300.00	6	3	2026-03-02 15:15:29.349386+00	2026-03-02 15:17:57.260782+00	tite	80.00	Sample perfume
1	SKU-001	Sample Product UPDATED	120.00	95	3	2026-02-28 03:02:32.338055+00	2026-03-07 09:02:29.316757+00	Skincare	0.00	
6	gsgrs	eat	100.00	46	20	2026-03-05 16:16:04.246992+00	2026-03-07 09:18:33.597277+00	Alcohol	99.00	zfgj
5	aso	tae	120.00	95	20	2026-03-05 15:49:04.554043+00	2026-03-07 09:34:18.803694+00	Fragrance	80.00	dgsgahfahr
\.


--
-- Data for Name: sale_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_items (id, sale_id, product_id, qty, unit_price) FROM stdin;
1	1	1	2	120.00
2	4	1	2	120.00
3	5	1	2	120.00
4	6	1	1	120.00
5	7	4	1	300.00
6	8	4	2	300.00
7	9	4	2	300.00
8	16	4	4	300.00
9	18	6	2	100.00
10	19	1	5	120.00
11	20	6	5	100.00
12	21	6	1	100.00
13	22	5	5	120.00
\.


--
-- Data for Name: sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales (id, total, created_by, created_at, customer_name, staff_name, subtotal, discount_type, discount_value, discount_amount) FROM stdin;
1	240.00	\N	2026-03-02 02:04:08.47889+00	\N	\N	0.00	\N	0.00	0.00
4	240.00	\N	2026-03-02 02:24:40.685095+00	\N	\N	0.00	\N	0.00	0.00
5	240.00	\N	2026-03-03 14:59:43.087097+00	\N	\N	0.00	\N	0.00	0.00
6	120.00	\N	2026-03-03 17:55:14.294706+00	\N	\N	0.00	\N	0.00	0.00
7	300.00	\N	2026-03-03 18:44:34.199929+00	\N	\N	0.00	\N	0.00	0.00
8	600.00	\N	2026-03-03 18:48:10.853027+00	\N	\N	0.00	\N	0.00	0.00
9	600.00	\N	2026-03-03 18:50:27.331644+00	\N	\N	0.00	\N	0.00	0.00
16	1200.00	\N	2026-03-07 03:33:17.602053+00	\N	\N	0.00	\N	0.00	0.00
18	200.00	1	2026-03-07 08:38:29.576139+00	\N	\N	0.00	\N	0.00	0.00
19	480.00	1	2026-03-07 09:02:29.316757+00	\N	\N	0.00	\N	0.00	0.00
20	500.00	1	2026-03-07 09:03:08.501382+00	\N	\N	0.00	\N	0.00	0.00
21	99.98	1	2026-03-07 09:18:33.597277+00	\N	\N	0.00	\N	0.00	0.00
22	600.00	1	2026-03-07 09:34:18.803694+00	\N	\N	0.00	\N	0.00	0.00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, clerk_id, name, email, role, created_at) FROM stdin;
1	admin_001	Admin User	admin@bellah.test	admin	2026-03-07 08:38:29.576139+00
\.


--
-- Name: ai_content_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ai_content_id_seq', 6, true);


--
-- Name: campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.campaigns_id_seq', 1, false);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.products_id_seq', 6, true);


--
-- Name: sale_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_items_id_seq', 13, true);


--
-- Name: sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_id_seq', 22, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- Name: ai_content ai_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content
    ADD CONSTRAINT ai_content_pkey PRIMARY KEY (id);


--
-- Name: campaign_content campaign_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content
    ADD CONSTRAINT campaign_content_pkey PRIMARY KEY (campaign_id, content_id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_key UNIQUE (sku);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: users users_clerk_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_id_key UNIQUE (clerk_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_content ai_content_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content
    ADD CONSTRAINT ai_content_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: ai_content ai_content_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_content
    ADD CONSTRAINT ai_content_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: campaign_content campaign_content_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content
    ADD CONSTRAINT campaign_content_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_content campaign_content_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_content
    ADD CONSTRAINT campaign_content_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.ai_content(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict qSV8xrmfW9rMlBrdlFSTb8WamRbAIkrNA03l2EEPQxiRtVPJVj2H4Puw2mDchpQ

