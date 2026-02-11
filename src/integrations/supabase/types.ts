export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          created_at: string
          id: string
          notes: string | null
          partner_id: string | null
          plan_id: string | null
          reminder_sent: boolean
          service_slug: string
          service_title: string
          session_number: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          plan_id?: string | null
          reminder_sent?: boolean
          service_slug: string
          service_title: string
          session_number?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          created_at?: string
          id?: string
          notes?: string | null
          partner_id?: string | null
          plan_id?: string | null
          reminder_sent?: boolean
          service_slug?: string
          service_title?: string
          session_number?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "client_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      client_plans: {
        Row: {
          appointment_id: string | null
          completed_sessions: number
          created_at: string
          created_by: string
          created_by_user_id: string | null
          id: string
          notes: string | null
          plan_name: string
          service_slug: string
          service_title: string
          status: string
          total_sessions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          completed_sessions?: number
          created_at?: string
          created_by?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          plan_name: string
          service_slug: string
          service_title: string
          status?: string
          total_sessions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          completed_sessions?: number
          created_at?: string
          created_by?: string
          created_by_user_id?: string | null
          id?: string
          notes?: string | null
          plan_name?: string
          service_slug?: string
          service_title?: string
          status?: string
          total_sessions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      partner_services: {
        Row: {
          id: string
          partner_id: string
          service_slug: string
        }
        Insert: {
          id?: string
          partner_id: string
          service_slug: string
        }
        Update: {
          id?: string
          partner_id?: string
          service_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_services_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          avatar_url: string | null
          commission_pct: number
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string
          salary_cents: number
          updated_at: string
          user_id: string
          work_days: string[]
          work_end: string
          work_start: string
        }
        Insert: {
          avatar_url?: string | null
          commission_pct?: number
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string
          salary_cents?: number
          updated_at?: string
          user_id: string
          work_days?: string[]
          work_end?: string
          work_start?: string
        }
        Update: {
          avatar_url?: string | null
          commission_pct?: number
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string
          salary_cents?: number
          updated_at?: string
          user_id?: string
          work_days?: string[]
          work_end?: string
          work_start?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number | null
          appointment_id: string | null
          created_at: string
          external_id: string | null
          id: string
          metadata: Json | null
          method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          appointment_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          method: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          appointment_id?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          last_seen: string | null
          phone: string
          sex: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          address: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          last_seen?: string | null
          phone: string
          sex: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          last_seen?: string | null
          phone?: string
          sex?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      service_prices: {
        Row: {
          id: string
          plan_name: string
          price_per_session_cents: number
          service_slug: string
          sessions: number
          total_price_cents: number
          updated_at: string
        }
        Insert: {
          id?: string
          plan_name: string
          price_per_session_cents?: number
          service_slug: string
          sessions?: number
          total_price_cents?: number
          updated_at?: string
        }
        Update: {
          id?: string
          plan_name?: string
          price_per_session_cents?: number
          service_slug?: string
          sessions?: number
          total_price_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          benefits: string[]
          created_at: string
          duration: string
          full_description: string
          icon_name: string
          id: string
          image_url: string | null
          is_active: boolean
          price_label: string
          sessions_label: string
          short_description: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          benefits?: string[]
          created_at?: string
          duration?: string
          full_description?: string
          icon_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_label?: string
          sessions_label?: string
          short_description?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          benefits?: string[]
          created_at?: string
          duration?: string
          full_description?: string
          icon_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_label?: string
          sessions_label?: string
          short_description?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_stale_pending_appointments: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "partner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "partner"],
    },
  },
} as const
