-- Staff identity table — fully decoupled from `users` (the Clerk-mirrored
-- customer table) so super-admin work has its own credentials, audit trail,
-- and blast radius. No public sign-up; rows are created by
-- `pnpm staff:add <username>` or seeded here.
--
-- The seeded admin password below was bcrypt-hashed at migration write-time
-- (cost factor 12). See docs/STAFF_AUTH.md for the rotation procedure.

CREATE TABLE "staff_users" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "username"      text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "totp_secret"   text,
  "created_at"    timestamptz NOT NULL DEFAULT now(),
  "last_login_at" timestamptz
);

-- RLS: only app_admin (server-side credential, not the user-token role) can
-- touch this table. app_user has no access.
ALTER TABLE "staff_users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_users_admin_all" ON "staff_users" TO app_admin USING (true);

-- Seed the initial super-admin (username: admin). Hash is bcrypt of
-- ncCGXbwfpZ4Eq3wUiX88 with cost 12. Rotate via `pnpm staff:rotate admin`.
INSERT INTO "staff_users" ("username", "password_hash") VALUES
  ('admin', '$2b$12$5CfBdR/E0Kw7E6YKY4YGUeKBICielYXrnxEzTGui3bSFfp8OzD22m');
