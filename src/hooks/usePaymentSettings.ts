import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentSettings {
  pix_enabled: boolean;
  pix_key: string;
  pix_key_type: string;
  pix_beneficiary: string;
  mercadopago_enabled: boolean;
  mercadopago_public_key: string;
  mercadopago_access_token: string;
}

const defaults: PaymentSettings = {
  pix_enabled: false,
  pix_key: "",
  pix_key_type: "cpf",
  pix_beneficiary: "",
  mercadopago_enabled: false,
  mercadopago_public_key: "",
  mercadopago_access_token: "",
};

export const usePaymentSettings = () => {
  const [settings, setSettings] = useState<PaymentSettings>(defaults);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from("payment_settings").select("key, value");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((row: any) => { map[row.key] = row.value; });
      setSettings({
        pix_enabled: map.pix_enabled === "true",
        pix_key: map.pix_key || "",
        pix_key_type: map.pix_key_type || "cpf",
        pix_beneficiary: map.pix_beneficiary || "",
        mercadopago_enabled: map.mercadopago_enabled === "true",
        mercadopago_public_key: map.mercadopago_public_key || "",
        mercadopago_access_token: map.mercadopago_access_token || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  return { settings, loading, refetch: fetchSettings };
};
