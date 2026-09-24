
-- Fix: Use SECURITY INVOKER (default) so RLS on certifications table is enforced
DROP VIEW IF EXISTS public.certifications_secure;

CREATE VIEW public.certifications_secure
WITH (security_invoker = true)
AS
SELECT
  id, staff_id, name, certification_type,
  decrypt_sensitive(certification_number) AS certification_number,
  decrypt_sensitive(document_url) AS document_url,
  issue_date, expiry_date, issuing_organization,
  status, notes, created_by, created_at, updated_at,
  deleted_at, deleted_by
FROM certifications;
