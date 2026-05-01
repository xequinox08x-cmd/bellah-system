-- Migration 004: Add soft-delete support to products
-- Products that have sales history cannot be hard-deleted.
-- Instead we mark them inactive so they're hidden from the UI
-- but sales records remain intact.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
