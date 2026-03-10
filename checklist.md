# Bellah System — Master Checklist

## ✅ Month 1–2 — Foundation + Sales
- [x] Monorepo setup (pnpm workspaces)
- [x] Supabase DB + schema.sql
- [x] Products CRUD API + UI
- [x] Sales Entry API (with stock deduction)
- [x] Sales POS UI
- [x] Dashboard shell

## ✅ Month 3 — AI Content + Campaigns
- [x] Week 9 — AI Content API
  - [x] POST /api/ai-content (save draft)
  - [x] GET /api/ai-content (list + filter + pagination)
  - [x] PATCH /api/ai-content/:id/status (approve/reject)
  - [x] POST /api/ai/generate (stub → 501)
  - [x] platform + hashtags columns on ai_content
- [x] Week 10 — AI Content UI
  - [x] AIMarketing.tsx — real API
  - [x] ContentApproval.tsx — real API
  - [x] api.ts — all AI content functions
- [x] Week 11 — Campaigns API
  - [x] GET/POST/PUT/DELETE /api/campaigns
  - [x] POST /api/campaigns/:id/content (approved only)
  - [x] DELETE /api/campaigns/:id/content/:contentId
- [x] Week 12 — Scheduling
  - [x] scheduled_posts table (Supabase)
  - [x] GET/POST /api/scheduled-posts
  - [x] GET /api/scheduled-posts/pending (for n8n)
  - [x] PATCH /api/scheduled-posts/:id/status
  - [x] DELETE /api/scheduled-posts/:id
  - [x] Campaigns.tsx — real API
  - [x] Scheduling.tsx — real API

## 🔄 Month 4 — AI Intelligence Layer (Current)
- [x] Week 13 — AI Sales Forecasting
  - [x] ai_forecast table (Supabase)
  - [x] ai_recommendation table (Supabase)
  - [x] POST /api/forecasts/generate (7-day moving average)
  - [x] GET /api/forecasts
  - [x] GET /api/forecasts/alerts (products below 50% of forecast)
  - [x] api.ts — generateForecasts, getForecasts, getForecastAlerts
  - [x] AdminDashboard rewrite
    - [x] KPI cards (revenue today/week/month, low stock, scheduled posts)
    - [x] 7-day sales trend chart
    - [x] Run Forecast button
    - [x] Critical Alert modal (products below threshold)
    - [x] Alert badge in header

- [ ] Week 14 — Critical Alert + AI Recommendation
  - [ ] POST /api/recommendations — call OpenAI + save to ai_recommendation
  - [ ] GET /api/recommendations — list past recommendations
  - [ ] Wire to Critical Alert modal — show AI text when alert fires
  - [ ] api.ts — generateRecommendation, getRecommendations

- [ ] Week 15 — n8n + Facebook Integration
  - [ ] Apply for Facebook Developer App ⚠️ (do this NOW — takes 1–2 weeks)
  - [ ] n8n Workflow 1 — auto-publish pending posts to Facebook
  - [ ] n8n Workflow 2 — daily engagement pull (likes/comments/shares/reach)
  - [ ] n8n Workflow 3 — hourly sales drop detector → trigger recommendation
  - [ ] engagement_data table (Supabase)

## ❌ Month 5 — Auth + Analytics (April 2026)
- [ ] Week 16 — Supabase Auth
  - [ ] Remove mock AuthContext
  - [ ] @supabase/supabase-js auth on Login page
  - [ ] JWT middleware on all API routes
  - [ ] Role-based routing (admin vs staff)
  - [ ] ALTER TABLE users ADD COLUMN auth_id TEXT UNIQUE

- [ ] Week 17 — Performance & ROI Page
  - [ ] GET /api/analytics/kpis
  - [ ] GET /api/analytics/campaigns
  - [ ] GET /api/analytics/engagement
  - [ ] Analytics.tsx — KPI bars, Campaign Performance, AI Recommendations tabs

- [ ] Week 18 — User Management (Admin Only)
  - [ ] GET/POST/PUT/DELETE /api/users
  - [ ] Users.tsx — view/add/edit/deactivate/delete

## ❌ Month 6 — Deployment + Evaluation (May–June 2026)
- [ ] Week 19 — Deploy
  - [ ] Frontend → Vercel
  - [ ] API → Render or Fly.io
  - [ ] Set all env vars in production
  - [ ] Point n8n to production API URL

- [ ] Week 20 — ISO/IEC 25010:2018 Evaluation
  - [ ] UAT survey forms drafted
  - [ ] Tested on Chrome, Firefox, Edge, mobile
  - [ ] Conduct UAT at office

- [ ] Week 21 — Demo + Thesis
  - [ ] Load realistic test data
  - [ ] Record demo video
  - [ ] Finalize thesis manuscript (Chapters 4 & 5)
  - [ ] Prepare for defense