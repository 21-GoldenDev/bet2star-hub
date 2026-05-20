-- Default lives on each prizes[] row: { prize_id, commission, status, default: boolean }.
-- Migrate legacy terminal.default_prize_id, then drop that column.

UPDATE terminal t
SET prizes = (
  SELECT COALESCE(
    jsonb_agg(
      elem
      || jsonb_build_object(
        'default',
        CASE
          WHEN t.default_prize_id IS NOT NULL
            AND (elem->>'prize_id') = t.default_prize_id::text THEN true
          WHEN COALESCE((elem->>'default')::boolean, false) THEN true
          ELSE false
        END
      )
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(t.prizes) = 'array' THEN t.prizes
      ELSE '[]'::jsonb
    END
  ) AS elem
)
WHERE t.prizes IS NOT NULL
  AND jsonb_typeof(t.prizes) = 'array';

ALTER TABLE terminal DROP COLUMN IF EXISTS default_prize_id;
