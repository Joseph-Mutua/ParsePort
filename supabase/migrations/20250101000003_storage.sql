INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'message/rfc822', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: users can only access objects in paths that start with their org_id
CREATE POLICY documents_storage_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (SELECT org_id::TEXT FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY documents_storage_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (SELECT org_id::TEXT FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'broker'))
  );

CREATE POLICY documents_storage_update ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (SELECT org_id::TEXT FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'broker'))
  );

CREATE POLICY documents_storage_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (SELECT org_id::TEXT FROM org_members WHERE user_id = auth.uid() AND role IN ('admin', 'broker'))
  );
