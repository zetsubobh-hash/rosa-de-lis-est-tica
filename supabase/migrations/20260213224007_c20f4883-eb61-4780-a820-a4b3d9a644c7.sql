
INSERT INTO site_settings (key, value) VALUES 
  ('google_place_id', 'ChIJyQkMYJq9pgARTMuDkHWjNl0'),
  ('google_api_key', '')
ON CONFLICT (key) DO NOTHING;
