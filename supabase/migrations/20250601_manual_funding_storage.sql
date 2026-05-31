-- Storage bucket for manual funding attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manual-funding',
  'manual-funding',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own folder
CREATE POLICY "Users upload own manual funding files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'manual-funding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own files
CREATE POLICY "Users read own manual funding files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'manual-funding'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
