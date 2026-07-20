CREATE OR REPLACE FUNCTION public.verify_fetch_levels_secret(_secret text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE stored text;
BEGIN
  SELECT decrypted_secret INTO stored
  FROM vault.decrypted_secrets
  WHERE name = 'fetch_levels_cron_secret';
  IF stored IS NULL OR _secret IS NULL THEN RETURN false; END IF;
  RETURN stored = _secret;
END $$;

REVOKE ALL ON FUNCTION public.verify_fetch_levels_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_fetch_levels_secret(text) TO service_role;