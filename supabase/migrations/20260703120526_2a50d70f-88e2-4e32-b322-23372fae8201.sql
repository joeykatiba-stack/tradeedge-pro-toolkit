-- Lock down trigger-only SECURITY DEFINER functions and add missing storage UPDATE policy

-- 1. Revoke execute on trigger-only SECURITY DEFINER functions from public/authenticated/anon.
--    These are only meant to be invoked by triggers (as their definer), not called directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Add missing UPDATE policy on the chart-screenshots storage bucket so users can only
--    overwrite their own files (path convention: <uid>/...).
CREATE POLICY "Users can update their own chart screenshots"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chart-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chart-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
