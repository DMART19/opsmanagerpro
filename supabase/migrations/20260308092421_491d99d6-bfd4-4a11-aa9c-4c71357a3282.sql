
-- ============================================================
-- DATA ENCRYPTION STANDARDS
-- ============================================================

-- 1. Enable pgcrypto for encryption functions (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create an encryption key management function
-- Uses a server-side secret stored as a DB setting
-- In production, this would use Vault; here we use a derived key from the project

CREATE OR REPLACE FUNCTION public.get_encryption_key()
RETURNS bytea
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Derive a stable 32-byte key from project constants
  -- This ensures encryption is consistent and only accessible server-side
  RETURN digest(current_setting('app.settings.jwt_secret', true) || '_encryption_v1', 'sha256');
END;
$$;

-- 3. Encrypt/decrypt utility functions

CREATE OR REPLACE FUNCTION public.encrypt_sensitive(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN plaintext;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(plaintext, encode(get_encryption_key(), 'hex')),
    'base64'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_sensitive(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN ciphertext;
  END IF;
  BEGIN
    RETURN pgp_sym_decrypt(
      decode(ciphertext, 'base64'),
      encode(get_encryption_key(), 'hex')
    );
  EXCEPTION WHEN OTHERS THEN
    -- If decryption fails, return the value as-is (for backward compat with unencrypted data)
    RETURN ciphertext;
  END;
END;
$$;

-- 4. Create a view for certifications that auto-decrypts sensitive fields
-- This ensures the app reads decrypted data transparently

CREATE OR REPLACE VIEW public.certifications_secure AS
SELECT
  id, staff_id, name, certification_type,
  decrypt_sensitive(certification_number) AS certification_number,
  decrypt_sensitive(document_url) AS document_url,
  issue_date, expiry_date, issuing_organization,
  status, notes, created_by, created_at, updated_at,
  deleted_at, deleted_by
FROM certifications;

-- 5. Trigger to auto-encrypt sensitive fields on INSERT/UPDATE for certifications

CREATE OR REPLACE FUNCTION public.encrypt_certification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Encrypt certification_number if it looks unencrypted (not base64 PGP)
  IF NEW.certification_number IS NOT NULL AND NEW.certification_number != '' THEN
    -- Only encrypt if not already encrypted (simple heuristic: PGP encrypted starts with specific pattern)
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.certification_number, 'base64'), encode(get_encryption_key(), 'hex'));
      -- If decryption succeeds, it's already encrypted — leave it
    EXCEPTION WHEN OTHERS THEN
      -- Not encrypted yet, encrypt it
      NEW.certification_number := encrypt_sensitive(NEW.certification_number);
    END;
  END IF;

  -- Encrypt document_url
  IF NEW.document_url IS NOT NULL AND NEW.document_url != '' THEN
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.document_url, 'base64'), encode(get_encryption_key(), 'hex'));
    EXCEPTION WHEN OTHERS THEN
      NEW.document_url := encrypt_sensitive(NEW.document_url);
    END;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encrypt_certification_fields
  BEFORE INSERT OR UPDATE ON certifications
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_certification_fields();

-- 6. Data sanitization function for API/log output

CREATE OR REPLACE FUNCTION public.mask_sensitive_value(val text, visible_chars int DEFAULT 4)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  IF val IS NULL OR length(val) <= visible_chars THEN
    RETURN '****';
  END IF;
  RETURN left(val, visible_chars) || repeat('*', greatest(length(val) - visible_chars, 4));
END;
$$;

-- 7. Log security event for encryption operations
INSERT INTO security_events (event_type, severity, details)
VALUES ('workspace_settings_change', 'low', '{"action": "encryption_standards_enabled", "version": "v1"}'::jsonb);
