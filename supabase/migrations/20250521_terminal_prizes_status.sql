-- Backfill terminal.prizes JSON array: add status "active" where missing.
-- Canonical shape per row: { "prize_id": "...", "commission": number, "status": "active"|"inactive" }

UPDATE terminal
SET prizes = (
  SELECT COALESCE(
    jsonb_agg(
      elem || CASE
        WHEN elem ? 'status' THEN '{}'::jsonb
        ELSE '{"status":"active"}'::jsonb
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(prizes) = 'array' THEN prizes
      ELSE '[]'::jsonb
    END
  ) AS elem
)
WHERE prizes IS NOT NULL
  AND jsonb_typeof(prizes) = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(prizes) AS e
    WHERE NOT (e ? 'status')
  );
