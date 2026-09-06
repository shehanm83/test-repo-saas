ALTER TABLE workspaces
  ALTER COLUMN monthly_credit_grant SET DEFAULT 20;

UPDATE workspaces
SET
  monthly_credit_grant = 20,
  brand_quota = 1,
  seat_quota = 1
WHERE plan_code = 'free';

UPDATE workspaces
SET
  plan_code = 'subscription',
  brand_quota = 3,
  seat_quota = 3,
  monthly_credit_grant = 1000
WHERE plan_code IN ('starter', 'pro', 'business', 'agency');

UPDATE subscriptions
SET plan_code = 'subscription'
WHERE plan_code IN ('starter', 'pro', 'business', 'agency');
