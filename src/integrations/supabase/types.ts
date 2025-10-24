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
      application_notifications: {
        Row: {
          application_id: string
          created_at: string | null
          delivered_at: string | null
          delivery_status: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          scheduled_for: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          scheduled_for: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          scheduled_for?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string
          previous_status: string | null
        }
        Insert: {
          application_id: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: string
          previous_status?: string | null
        }
        Update: {
          application_id?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_status_history_application"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          ai_enrichment: Json | null
          application_guidance: Json | null
          application_status: string | null
          application_steps: string | null
          applied_confirmed: boolean | null
          category: string | null
          date_confidence: string | null
          date_source: string | null
          dates_last_verified: string | null
          deadline_reminders: Json | null
          description: string | null
          documents_required: Json | null
          dpiit_required: boolean | null
          eligibility: string | null
          fee_structure: string | null
          funding_amount: string | null
          id: string
          important_dates: Json | null
          last_checked_at: string | null
          local_availability_cache: Json | null
          notification_preferences: Json | null
          program_type: string | null
          saved_at: string | null
          sector: string | null
          source_check_frequency: string | null
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
          application_status?: string | null
          application_steps?: string | null
          applied_confirmed?: boolean | null
          category?: string | null
          date_confidence?: string | null
          date_source?: string | null
          dates_last_verified?: string | null
          deadline_reminders?: Json | null
          description?: string | null
          documents_required?: Json | null
          dpiit_required?: boolean | null
          eligibility?: string | null
          fee_structure?: string | null
          funding_amount?: string | null
          id?: string
          important_dates?: Json | null
          last_checked_at?: string | null
          local_availability_cache?: Json | null
          notification_preferences?: Json | null
          program_type?: string | null
          saved_at?: string | null
          sector?: string | null
          source_check_frequency?: string | null
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
          application_status?: string | null
          application_steps?: string | null
          applied_confirmed?: boolean | null
          category?: string | null
          date_confidence?: string | null
          date_source?: string | null
          dates_last_verified?: string | null
          deadline_reminders?: Json | null
          description?: string | null
          documents_required?: Json | null
          dpiit_required?: boolean | null
          eligibility?: string | null
          fee_structure?: string | null
          funding_amount?: string | null
          id?: string
          important_dates?: Json | null
          last_checked_at?: string | null
          local_availability_cache?: Json | null
          notification_preferences?: Json | null
          program_type?: string | null
          saved_at?: string | null
          sector?: string | null
          source_check_frequency?: string | null
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
      audio_news_bulletins: {
        Row: {
          audio_base64: string | null
          audio_url: string | null
          created_at: string | null
          duration_seconds: number
          expires_at: string | null
          generated_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          story_ids: string[]
          title: string
          view_count: number | null
        }
        Insert: {
          audio_base64?: string | null
          audio_url?: string | null
          created_at?: string | null
          duration_seconds: number
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          story_ids: string[]
          title: string
          view_count?: number | null
        }
        Update: {
          audio_base64?: string | null
          audio_url?: string | null
          created_at?: string | null
          duration_seconds?: number
          expires_at?: string | null
          generated_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          story_ids?: string[]
          title?: string
          view_count?: number | null
        }
        Relationships: []
      }
      audio_news_scripts: {
        Row: {
          bulletin_id: string | null
          created_at: string | null
          hindi_script: string
          id: string
          story_id: string | null
          story_order: number
        }
        Insert: {
          bulletin_id?: string | null
          created_at?: string | null
          hindi_script: string
          id?: string
          story_id?: string | null
          story_order: number
        }
        Update: {
          bulletin_id?: string | null
          created_at?: string | null
          hindi_script?: string
          id?: string
          story_id?: string | null
          story_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "audio_news_scripts_bulletin_id_fkey"
            columns: ["bulletin_id"]
            isOneToOne: false
            referencedRelation: "audio_news_bulletins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_news_scripts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "discovery_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_stories: {
        Row: {
          category: string
          click_count: number | null
          created_at: string | null
          excerpt: string | null
          expires_at: string | null
          full_content: string | null
          headline: string
          id: string
          image_alt: string | null
          image_url: string | null
          impact_statement: string | null
          is_active: boolean | null
          is_featured: boolean | null
          key_takeaways: string[] | null
          published_date: string | null
          region: string | null
          relevance_score: number | null
          save_count: number | null
          scraped_at: string | null
          share_count: number | null
          source_name: string | null
          source_url: string
          states: string[] | null
          subcategory: string | null
          summary: string
          tags: string[] | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          category: string
          click_count?: number | null
          created_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          full_content?: string | null
          headline: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_statement?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          published_date?: string | null
          region?: string | null
          relevance_score?: number | null
          save_count?: number | null
          scraped_at?: string | null
          share_count?: number | null
          source_name?: string | null
          source_url: string
          states?: string[] | null
          subcategory?: string | null
          summary: string
          tags?: string[] | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          category?: string
          click_count?: number | null
          created_at?: string | null
          excerpt?: string | null
          expires_at?: string | null
          full_content?: string | null
          headline?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_statement?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          published_date?: string | null
          region?: string | null
          relevance_score?: number | null
          save_count?: number | null
          scraped_at?: string | null
          share_count?: number | null
          source_name?: string | null
          source_url?: string
          states?: string[] | null
          subcategory?: string | null
          summary?: string
          tags?: string[] | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      indian_blocks: {
        Row: {
          created_at: string | null
          district_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          district_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          district_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "indian_blocks_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "indian_districts"
            referencedColumns: ["id"]
          },
        ]
      }
      indian_districts: {
        Row: {
          created_at: string | null
          id: string
          name: string
          state_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          state_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          state_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "indian_districts_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "indian_states"
            referencedColumns: ["id"]
          },
        ]
      }
      indian_states: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
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
          push_subscription: Json | null
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
          push_subscription?: Json | null
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
          push_subscription?: Json | null
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
      scheme_stats: {
        Row: {
          applicants_count: number | null
          application_id: string
          competition_ratio: string | null
          confidence_score: number | null
          created_at: string | null
          data_confidence: string | null
          data_source: string | null
          id: string
          source_quote: string | null
          updated_at: string | null
          vacancies: number | null
          year: number
        }
        Insert: {
          applicants_count?: number | null
          application_id: string
          competition_ratio?: string | null
          confidence_score?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          source_quote?: string | null
          updated_at?: string | null
          vacancies?: number | null
          year: number
        }
        Update: {
          applicants_count?: number | null
          application_id?: string
          competition_ratio?: string | null
          confidence_score?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
          id?: string
          source_quote?: string | null
          updated_at?: string | null
          vacancies?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "scheme_stats_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      story_scraping_sources: {
        Row: {
          avg_articles_per_scrape: number | null
          category: string
          created_at: string | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_scraped_at: string | null
          last_success_at: string | null
          priority: number | null
          region: string | null
          scrape_config: Json | null
          source_name: string
          source_type: string
          success_count: number | null
          total_scrapes: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          avg_articles_per_scrape?: number | null
          category: string
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_scraped_at?: string | null
          last_success_at?: string | null
          priority?: number | null
          region?: string | null
          scrape_config?: Json | null
          source_name: string
          source_type: string
          success_count?: number | null
          total_scrapes?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          avg_articles_per_scrape?: number | null
          category?: string
          created_at?: string | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_scraped_at?: string | null
          last_success_at?: string | null
          priority?: number | null
          region?: string | null
          scrape_config?: Json | null
          source_name?: string
          source_type?: string
          success_count?: number | null
          total_scrapes?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      user_story_interactions: {
        Row: {
          clicked_source_at: string | null
          created_at: string | null
          id: string
          read_duration_seconds: number | null
          saved_at: string | null
          shared_at: string | null
          story_id: string
          unsaved_at: string | null
          updated_at: string | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          clicked_source_at?: string | null
          created_at?: string | null
          id?: string
          read_duration_seconds?: number | null
          saved_at?: string | null
          shared_at?: string | null
          story_id: string
          unsaved_at?: string | null
          updated_at?: string | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          clicked_source_at?: string | null
          created_at?: string | null
          id?: string
          read_duration_seconds?: number | null
          saved_at?: string | null
          shared_at?: string | null
          story_id?: string
          unsaved_at?: string | null
          updated_at?: string | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_story_interactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "discovery_stories"
            referencedColumns: ["id"]
          },
        ]
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
