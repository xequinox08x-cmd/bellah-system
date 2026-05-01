-- USERS
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  auth_id    TEXT UNIQUE,                        -- Supabase auth UUID
  name       TEXT NOT NULL DEFAULT '',
  email      TEXT UNIQUE NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRODUCTS / INVENTORY
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SALES (header)
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SALES ITEMS (lines)
CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  qty INT NOT NULL CHECK (qty > 0),
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- AI CONTENT
CREATE TABLE IF NOT EXISTS ai_content (
  id SERIAL PRIMARY KEY,
  title TEXT,
  prompt TEXT NOT NULL,
  output TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by INT REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CAMPAIGNS
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- LINK: campaigns <-> content (many-to-many)
CREATE TABLE IF NOT EXISTS campaign_content (
  campaign_id INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  content_id INT NOT NULL REFERENCES ai_content(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, content_id)
);

-- ADD MISSING COLUMNS TO ai_content IF THEY DONT EXIST (using DO block or ALTER)
ALTER TABLE ai_content ADD COLUMN IF NOT EXISTS hashtags TEXT;
ALTER TABLE ai_content ADD COLUMN IF NOT EXISTS platform TEXT;

-- SCHEDULED POSTS
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id              SERIAL PRIMARY KEY,
  content_id      INT NOT NULL REFERENCES ai_content(id) ON DELETE CASCADE,
  campaign_id     INT REFERENCES campaigns(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  platform        TEXT NOT NULL DEFAULT 'facebook',
  status          TEXT NOT NULL DEFAULT 'pending',
  facebook_post_id TEXT,
  published_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI FORECAST
CREATE TABLE IF NOT EXISTS ai_forecast (
  id              SERIAL PRIMARY KEY,
  product_id      INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  forecast_date   DATE NOT NULL,
  forecast_value  NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_value    NUMERIC(10,2),
  accuracy        NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, forecast_date)
);

