-- Seed default users for development.
-- Safe to run multiple times.

INSERT INTO users (clerk_id, name, email, role)
VALUES
  ('admin_001', 'Admin User', 'admin@bellah.test', 'admin'),
  ('staff_001', 'Staff Member', 'staff@bellah.test', 'staff')
ON CONFLICT (clerk_id)
DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- Verify users exist
SELECT id, clerk_id, name, email, role
FROM users
WHERE clerk_id IN ('admin_001', 'staff_001')
ORDER BY id;
