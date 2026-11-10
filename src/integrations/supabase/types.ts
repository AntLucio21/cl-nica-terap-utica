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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      clinic_blocks: {
        Row: {
          ends_at: string
          id: string
          reason: string
          starts_at: string
        }
        Insert: {
          ends_at: string
          id?: string
          reason?: string
          starts_at: string
        }
        Update: {
          ends_at?: string
          id?: string
          reason?: string
          starts_at?: string
        }
        Relationships: []
      }
      clinic_hours: {
        Row: {
          end_time: string
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: []
      }
      clinic_settings: {
        Row: {
          billing_template: string
          cancel_charge_pct: number
          cancel_notice_hours: number
          charge_no_show: boolean
          clinic_name: string
          clinic_phone: string
          default_duration_min: number
          default_price: number
          id: number
          interval_min: number
          logo_url: string
          no_show_charge_pct: number
          payment_methods: string[]
          pix_key: string
          reception_can_see_financials: boolean
          reminder_hours_before: number
          reminder_template: string
          updated_at: string
        }
        Insert: {
          billing_template?: string
          cancel_charge_pct?: number
          cancel_notice_hours?: number
          charge_no_show?: boolean
          clinic_name?: string
          clinic_phone?: string
          default_duration_min?: number
          default_price?: number
          id?: number
          interval_min?: number
          logo_url?: string
          no_show_charge_pct?: number
          payment_methods?: string[]
          pix_key?: string
          reception_can_see_financials?: boolean
          reminder_hours_before?: number
          reminder_template?: string
          updated_at?: string
        }
        Update: {
          billing_template?: string
          cancel_charge_pct?: number
          cancel_notice_hours?: number
          charge_no_show?: boolean
          clinic_name?: string
          clinic_phone?: string
          default_duration_min?: number
          default_price?: number
          id?: number
          interval_min?: number
          logo_url?: string
          no_show_charge_pct?: number
          payment_methods?: string[]
          pix_key?: string
          reception_can_see_financials?: boolean
          reminder_hours_before?: number
          reminder_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
          session_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id: string
          session_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_packages: {
        Row: {
          active: boolean
          created_at: string
          expires_on: string | null
          id: string
          name: string
          patient_id: string
          starts_on: string
          total_price: number
          total_sessions: number
          used_sessions: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          expires_on?: string | null
          id?: string
          name: string
          patient_id: string
          starts_on?: string
          total_price?: number
          total_sessions: number
          used_sessions?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          expires_on?: string | null
          id?: string
          name?: string
          patient_id?: string
          starts_on?: string
          total_price?: number
          total_sessions?: number
          used_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "patient_packages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          active: boolean
          birth_date: string | null
          created_at: string
          default_price: number
          email: string | null
          full_name: string
          id: string
          phone: string
          phone_needs_review: boolean
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          default_price?: number
          email?: string | null
          full_name: string
          id?: string
          phone?: string
          phone_needs_review?: boolean
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          default_price?: number
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          phone_needs_review?: boolean
        }
        Relationships: []
      }
      sessions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          duration_min: number
          id: string
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          payment_status: string
          price: number
          reminder_sent_at: string | null
          starts_at: string
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          payment_status?: string
          price?: number
          reminder_sent_at?: string | null
          starts_at: string
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          payment_status?: string
          price?: number
          reminder_sent_at?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      reception_can_see_financials: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "terapeuta" | "secretaria"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["terapeuta", "secretaria"],
    },
  },
} as const
