import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setIsAdmin(false);
      setIsPartner(false);
      setLoading(false);
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      const roles = data?.map((r: any) => r.role) || [];
      setIsAdmin(roles.includes("admin"));
      setIsPartner(roles.includes("partner"));
      setLoading(false);
    };

    checkRole();
  }, [user, authLoading]);

  return { isAdmin, isPartner, loading };
};
