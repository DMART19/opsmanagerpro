-- Update workspace_plans limits to match the official pricing PDF
-- Inventory: 5 users, 1000 assets
-- Operations: 15 users, 5000 assets
-- Operations Pro: 50 users, 25000 assets

UPDATE workspace_plans
SET max_team_members = 5
WHERE plan = 'inventory' AND (max_team_members IS NULL OR max_team_members = 0);

UPDATE workspace_plans
SET max_team_members = 15
WHERE plan = 'operations' AND (max_team_members IS NULL OR max_team_members = 25);

UPDATE workspace_plans
SET max_team_members = 50
WHERE plan = 'operations_pro' AND (max_team_members IS NULL OR max_team_members = 100);