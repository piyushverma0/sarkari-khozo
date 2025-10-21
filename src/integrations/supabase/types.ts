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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          ai_enrichment: Json | null
          application_guidance: Json | null
          application_steps: string | null
          category: string | null
          deadline_reminders: Json | null
          description: string | null
          documents_required: Json | null
          dpiit_required: boolean | null
          eligibility: string | null
          fee_structure: string | null
          funding_amount: string | null
          id: string
          important_dates: Json | null
          program_type: string | null
          saved_at: string | null
          sector: string | null
          stage: string | null
          state_specific: string | null
          success_rate: string | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          ai_enrichment?: Json | null
          application_guidance?: Json | null
          application_steps?: string | null
          category?: string | null
          deadline_reminders?: Json | null
          description?: string | null
          documents_required?: Json | null
          dpiit_required?: boolean | null
          eligibility?: string | null
          fee_structure?: string | null
          funding_amount?: string | null
          id?: string
          important_dates?: Json | null
          program_type?: string | null
          saved_at?: string | null
          sector?: string | null
          stage?: string | null
          state_specific?: string | null
          success_rate?: string | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          ai_enrichment?: Json | null
          application_guidance?: Json | null
          application_steps?: string | null
          category?: string | null
          deadline_reminders?: Json | null
          description?: string | null
          documents_required?: Json | null
          dpiit_required?: boolean | null
          eligibility?: string | null
          fee_structure?: string | null
          funding_amount?: string | null
          id?: string
          important_dates?: Json | null
          program_type?: string | null
          saved_at?: string | null
          sector?: string | null
          stage?: string | null
          state_specific?: string | null
          success_rate?: string | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      local_check_queries: {
        Row: {
          block: string | null
          created_at: string | null
          district: string | null
          id: string
          program_id: string | null
          results_count: number | null
          state: string | null
          user_id: string
        }
        Insert: {
          block?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          program_id?: string | null
          results_count?: number | null
          state?: string | null
          user_id: string
        }
        Update: {
          block?: string | null
          created_at?: string | null
          district?: string | null
          id?: string
          program_id?: string | null
          results_count?: number | null
          state?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_check_queries_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      local_initiatives: {
        Row: {
          apply_url: string | null
          block: string | null
          category: string | null
          confidence_level: string | null
          contact_info: Json | null
          created_at: string | null
          deadline: string | null
          description: string | null
          district: string | null
          id: string
          last_verified_at: string | null
          mode: string | null
          program_title: string
          source_url: string | null
          state: string
          updated_at: string | null
        }
        Insert: {
          apply_url?: string | null
          block?: string | null
          category?: string | null
          confidence_level?: string | null
          contact_info?: Json | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          district?: string | null
          id?: string
          last_verified_at?: string | null
          mode?: string | null
          program_title: string
          source_url?: string | null
          state: string
          updated_at?: string | null
        }
        Update: {
          apply_url?: string | null
          block?: string | null
          category?: string | null
          confidence_level?: string | null
          contact_info?: Json | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          district?: string | null
          id?: string
          last_verified_at?: string | null
          mode?: string | null
          program_title?: string
          source_url?: string | null
          state?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          location_updated_at: string | null
          saved_block: string | null
          saved_district: string | null
          saved_state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location_updated_at?: string | null
          saved_block?: string | null
          saved_district?: string | null
          saved_state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          location_updated_at?: string | null
          saved_block?: string | null
          saved_district?: string | null
          saved_state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      program_feedback: {
        Row: {
          created_at: string
          did_apply: string | null
          feedback_text: string | null
          id: string
          is_relevant: boolean | null
          program_title: string
          program_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          did_apply?: string | null
          feedback_text?: string | null
          id?: string
          is_relevant?: boolean | null
          program_title: string
          program_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          did_apply?: string | null
          feedback_text?: string | null
          id?: string
          is_relevant?: boolean | null
          program_title?: string
          program_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
