-- PAYG workspaces can keep up to ten independent brand kits. The quota is
-- stored on each workspace, so existing customers need the same update as new
-- top-up checkouts receive from the billing plan definition.
UPDATE workspaces
SET brand_quota = 10
WHERE plan_code = 'payg';
