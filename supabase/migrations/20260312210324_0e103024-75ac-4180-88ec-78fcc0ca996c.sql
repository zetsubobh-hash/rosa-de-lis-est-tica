-- Add granular permission columns
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS can_create_appointments boolean NOT NULL DEFAULT false;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS can_reschedule boolean NOT NULL DEFAULT false;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS can_cancel boolean NOT NULL DEFAULT false;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS can_complete boolean NOT NULL DEFAULT false;

-- Migrate existing data: if can_manage_agenda was true, enable all new permissions
UPDATE public.partners SET
  can_create_appointments = can_manage_agenda,
  can_reschedule = can_manage_agenda,
  can_cancel = can_manage_agenda,
  can_complete = can_manage_agenda;

-- Update RLS policies: replace can_manage_agenda checks with any-permission check
-- Drop old policies
DROP POLICY IF EXISTS "Partners with agenda access can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Partners with agenda access can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Partners with agenda access can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Partners with agenda access can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Partners with agenda access can update plans" ON public.client_plans;
DROP POLICY IF EXISTS "Partners with agenda access can insert plans" ON public.client_plans;

-- Create new policies using any permission flag
CREATE POLICY "Partners with permissions can insert appointments"
ON public.appointments FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND p.can_create_appointments = true
  )
);

CREATE POLICY "Partners with permissions can update appointments"
ON public.appointments FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND (p.can_reschedule = true OR p.can_complete = true)
  )
);

CREATE POLICY "Partners with permissions can delete appointments"
ON public.appointments FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND p.can_cancel = true
  )
);

CREATE POLICY "Partners with any permission can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND (
      p.can_create_appointments = true OR p.can_reschedule = true OR p.can_cancel = true OR p.can_complete = true
    )
  )
);

CREATE POLICY "Partners with create permission can insert plans"
ON public.client_plans FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND p.can_create_appointments = true
  )
);

CREATE POLICY "Partners with complete permission can update plans"
ON public.client_plans FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'partner'::app_role) AND EXISTS (
    SELECT 1 FROM partners p WHERE p.user_id = auth.uid() AND p.can_complete = true
  )
);