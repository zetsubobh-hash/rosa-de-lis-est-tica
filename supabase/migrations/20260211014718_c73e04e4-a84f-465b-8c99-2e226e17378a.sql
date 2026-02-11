-- Protect master admin role from being deleted
CREATE OR REPLACE FUNCTION public.protect_master_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id = '4649913b-f48b-470e-b407-251803756157' AND OLD.role = 'admin' THEN
    RAISE EXCEPTION 'Cannot modify the master admin role';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_master_admin_trigger
BEFORE DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.protect_master_admin();

-- Also protect master admin profile from being updated by others
CREATE OR REPLACE FUNCTION public.protect_master_admin_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.user_id = '4649913b-f48b-470e-b407-251803756157' AND auth.uid() != '4649913b-f48b-470e-b407-251803756157' THEN
    RAISE EXCEPTION 'Cannot modify the master admin profile';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_master_admin_profile_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_master_admin_profile();