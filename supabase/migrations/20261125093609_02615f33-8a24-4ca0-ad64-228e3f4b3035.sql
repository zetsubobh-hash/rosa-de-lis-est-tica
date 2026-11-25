-- 1. site_themes: only expose the currently active theme to non-admin visitors
DROP POLICY IF EXISTS "Anyone can view themes" ON public.site_themes;
CREATE POLICY "Anyone can view active theme"
  ON public.site_themes
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- 2. page_views: replace WITH CHECK (true) with concrete payload validation
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert valid page views"
  ON public.page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    path IS NOT NULL
    AND left(path, 1) = '/'
    AND length(path) <= 300
    AND (referrer IS NULL OR length(referrer) <= 500)
    AND (user_agent IS NULL OR length(user_agent) <= 500)
  );