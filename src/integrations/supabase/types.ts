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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_deliveries: {
        Row: {
          alert_id: string
          attempts: number
          created_at: string
          delivered_at: string | null
          error: string | null
          farmer_id: string | null
          id: string
          next_retry_at: string | null
          phone: string
          provider: string
          provider_message_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          alert_id: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          farmer_id?: string | null
          id?: string
          next_retry_at?: string | null
          phone: string
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          alert_id?: string
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          farmer_id?: string | null
          id?: string
          next_retry_at?: string | null
          phone?: string
          provider?: string
          provider_message_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alert_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_deliveries_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          cluster_id: string
          id: string
          message: string
          metric_value: number | null
          rule_id: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          suppressed: boolean
          triggered_at: string
          type: Database["public"]["Enums"]["threshold_type"]
        }
        Insert: {
          cluster_id: string
          id?: string
          message: string
          metric_value?: number | null
          rule_id?: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          suppressed?: boolean
          triggered_at?: string
          type: Database["public"]["Enums"]["threshold_type"]
        }
        Update: {
          cluster_id?: string
          id?: string
          message?: string
          metric_value?: number | null
          rule_id?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          suppressed?: boolean
          triggered_at?: string
          type?: Database["public"]["Enums"]["threshold_type"]
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "threshold_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          created_at: string
          created_by: string | null
          crop_type: string | null
          field_agent_id: string | null
          id: string
          lat: number
          lga: string | null
          lng: number
          name: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crop_type?: string | null
          field_agent_id?: string | null
          id?: string
          lat: number
          lga?: string | null
          lng: number
          name: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crop_type?: string | null
          field_agent_id?: string | null
          id?: string
          lat?: number
          lga?: string | null
          lng?: number
          name?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          alerts_triggered: number
          clusters_checked: number
          deliveries_queued: number
          errors: Json | null
          finished_at: string | null
          id: string
          job_name: string
          started_at: string
          status: string
        }
        Insert: {
          alerts_triggered?: number
          clusters_checked?: number
          deliveries_queued?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Update: {
          alerts_triggered?: number
          clusters_checked?: number
          deliveries_queued?: number
          errors?: Json | null
          finished_at?: string | null
          id?: string
          job_name?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      farmers: {
        Row: {
          cluster_id: string
          created_at: string
          full_name: string
          id: string
          opted_out: boolean
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cluster_id: string
          created_at?: string
          full_name: string
          id?: string
          opted_out?: boolean
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cluster_id?: string
          created_at?: string
          full_name?: string
          id?: string
          opted_out?: boolean
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "farmers_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      threshold_rules: {
        Row: {
          active: boolean
          cluster_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_preset: boolean
          language: string
          metric: string
          severity: Database["public"]["Enums"]["severity_level"]
          state: string | null
          template_en: string
          template_ha: string | null
          template_pcm: string | null
          template_yo: string | null
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at: string
          value: number
          window_hours: number
        }
        Insert: {
          active?: boolean
          cluster_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_preset?: boolean
          language?: string
          metric: string
          severity: Database["public"]["Enums"]["severity_level"]
          state?: string | null
          template_en: string
          template_ha?: string | null
          template_pcm?: string | null
          template_yo?: string | null
          type: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
          value: number
          window_hours?: number
        }
        Update: {
          active?: boolean
          cluster_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_preset?: boolean
          language?: string
          metric?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          state?: string | null
          template_en?: string
          template_ha?: string | null
          template_pcm?: string | null
          template_yo?: string | null
          type?: Database["public"]["Enums"]["threshold_type"]
          updated_at?: string
          value?: number
          window_hours?: number
        }
        Relationships: [
          {
            foreignKeyName: "threshold_rules_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weather_readings: {
        Row: {
          cluster_id: string
          fetched_at: string
          humidity: number | null
          id: string
          rainfall_mm: number | null
          raw: Json | null
          temp_c: number | null
          temp_max_c: number | null
          wind_speed: number | null
        }
        Insert: {
          cluster_id: string
          fetched_at?: string
          humidity?: number | null
          id?: string
          rainfall_mm?: number | null
          raw?: Json | null
          temp_c?: number | null
          temp_max_c?: number | null
          wind_speed?: number | null
        }
        Update: {
          cluster_id?: string
          fetched_at?: string
          humidity?: number | null
          id?: string
          rainfall_mm?: number | null
          raw?: Json | null
          temp_c?: number | null
          temp_max_c?: number | null
          wind_speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_readings_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "super_admin" | "field_agent" | "farmer"
      delivery_status:
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "undelivered"
      severity_level: "watch" | "warning" | "emergency"
      threshold_type: "drought" | "flood" | "heat"
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
      app_role: ["super_admin", "field_agent", "farmer"],
      delivery_status: ["queued", "sent", "delivered", "failed", "undelivered"],
      severity_level: ["watch", "warning", "emergency"],
      threshold_type: ["drought", "flood", "heat"],
    },
  },
} as const
