-- Allow Daily/Mid-week Pools on games.type (Postgres enum: game_type).
ALTER TYPE game_type ADD VALUE IF NOT EXISTS 'daily_pools';
