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
      ai_explanations: {
        Row: {
          cache_hits: number | null
          context_after: string | null
          context_before: string | null
          created_at: string | null
          explanation_json: Json | null
          explanation_text: string
          id: string
          language: string | null
          last_accessed_at: string | null
          model_version: string | null
          note_id: string | null
          selected_text: string
          user_id: string | null
        }
        Insert: {
          cache_hits?: number | null
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          explanation_json?: Json | null
          explanation_text: string
          id?: string
          language?: string | null
          last_accessed_at?: string | null
          model_version?: string | null
          note_id?: string | null
          selected_text: string
          user_id?: string | null
        }
        Update: {
          cache_hits?: number | null
          context_after?: string | null
          context_before?: string | null
          created_at?: string | null
          explanation_json?: Json | null
          explanation_text?: string
          id?: string
          language?: string | null
          last_accessed_at?: string | null
          model_version?: string | null
          note_id?: string | null
          selected_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_explanations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notifications: {
        Row: {
          application_id: string | null
          created_at: string | null
          delivered_at: string | null
          delivery_status: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_channel: string | null
          notification_type: string
          priority: string | null
          read_at: string | null
          scheduled_for: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_channel?: string | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          scheduled_for: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_status?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_channel?: string | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
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
      application_views: {
        Row: {
          application_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          application_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_views_application_id_fkey"
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
          last_viewed_at: string | null
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
          view_count: number | null
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
          last_viewed_at?: string | null
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
          view_count?: number | null
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
          last_viewed_at?: string | null
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
          view_count?: number | null
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
          {
            foreignKeyName: "audio_news_scripts_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      collaborative_quiz_sessions: {
        Row: {
          created_at: string | null
          end_time: string | null
          host_user_id: string | null
          id: string
          note_id: string | null
          session_type: string
          settings: Json | null
          start_time: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          host_user_id?: string | null
          id?: string
          note_id?: string | null
          session_type: string
          settings?: Json | null
          start_time?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          host_user_id?: string | null
          id?: string
          note_id?: string | null
          session_type?: string
          settings?: Json | null
          start_time?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_quiz_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_stories: {
        Row: {
          category: string
          click_count: number | null
          click_through_rate: number | null
          created_at: string | null
          engagement_score: number | null
          excerpt: string | null
          expires_at: string | null
          first_viewed_at: string | null
          full_content: string | null
          headline: string
          id: string
          image_alt: string | null
          image_url: string | null
          impact_statement: string | null
          is_active: boolean | null
          is_featured: boolean | null
          key_takeaways: string[] | null
          last_notified_at: string | null
          notified: boolean | null
          published_date: string | null
          region: string | null
          relevance_score: number | null
          save_count: number | null
          save_rate: number | null
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
          views_last_updated: string | null
          views_this_week: number | null
          views_today: number | null
        }
        Insert: {
          category: string
          click_count?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          excerpt?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          full_content?: string | null
          headline: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_statement?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          last_notified_at?: string | null
          notified?: boolean | null
          published_date?: string | null
          region?: string | null
          relevance_score?: number | null
          save_count?: number | null
          save_rate?: number | null
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
          views_last_updated?: string | null
          views_this_week?: number | null
          views_today?: number | null
        }
        Update: {
          category?: string
          click_count?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          excerpt?: string | null
          expires_at?: string | null
          first_viewed_at?: string | null
          full_content?: string | null
          headline?: string
          id?: string
          image_alt?: string | null
          image_url?: string | null
          impact_statement?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          key_takeaways?: string[] | null
          last_notified_at?: string | null
          notified?: boolean | null
          published_date?: string | null
          region?: string | null
          relevance_score?: number | null
          save_count?: number | null
          save_rate?: number | null
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
          views_last_updated?: string | null
          views_this_week?: number | null
          views_today?: number | null
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
      note_collaborators: {
        Row: {
          accepted_at: string | null
          collaborator_id: string | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          note_id: string | null
          owner_id: string | null
          permission_level: string
        }
        Insert: {
          accepted_at?: string | null
          collaborator_id?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          note_id?: string | null
          owner_id?: string | null
          permission_level: string
        }
        Update: {
          accepted_at?: string | null
          collaborator_id?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          note_id?: string | null
          owner_id?: string | null
          permission_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_collaborators_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_edit_history: {
        Row: {
          edit_type: string | null
          edited_at: string | null
          id: string
          new_content: string | null
          note_id: string | null
          previous_content: string | null
          section_id: string
          user_id: string | null
        }
        Insert: {
          edit_type?: string | null
          edited_at?: string | null
          id?: string
          new_content?: string | null
          note_id?: string | null
          previous_content?: string | null
          section_id: string
          user_id?: string | null
        }
        Update: {
          edit_type?: string | null
          edited_at?: string | null
          id?: string
          new_content?: string | null
          note_id?: string | null
          previous_content?: string | null
          section_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_edit_history_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_flashcards: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          difficulty: string | null
          ease_factor: number | null
          hint: string | null
          id: string
          interval: number | null
          last_reviewed_at: string | null
          next_review_date: string | null
          note_id: string
          question: string
          repetitions: number | null
          times_correct: number | null
          times_incorrect: number | null
          times_reviewed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          ease_factor?: number | null
          hint?: string | null
          id?: string
          interval?: number | null
          last_reviewed_at?: string | null
          next_review_date?: string | null
          note_id: string
          question: string
          repetitions?: number | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_reviewed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          difficulty?: string | null
          ease_factor?: number | null
          hint?: string | null
          id?: string
          interval?: number | null
          last_reviewed_at?: string | null
          next_review_date?: string | null
          note_id?: string
          question?: string
          repetitions?: number | null
          times_correct?: number | null
          times_incorrect?: number | null
          times_reviewed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_flashcards_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_smart_folder: boolean | null
          name: string
          parent_folder_id: string | null
          smart_filter_rules: Json | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_smart_folder?: boolean | null
          name: string
          parent_folder_id?: string | null
          smart_filter_rules?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_smart_folder?: boolean | null
          name?: string
          parent_folder_id?: string | null
          smart_filter_rules?: Json | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      note_highlights: {
        Row: {
          color: string
          created_at: string | null
          end_offset: number
          id: string
          note_id: string | null
          section_id: string
          start_offset: number
          text_content: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          end_offset: number
          id?: string
          note_id?: string | null
          section_id: string
          start_offset: number
          text_content: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          end_offset?: number
          id?: string
          note_id?: string | null
          section_id?: string
          start_offset?: number
          text_content?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_highlights_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          note_id: string
          passing_score: number | null
          questions: Json
          quiz_type: string | null
          show_answers_immediately: boolean | null
          time_limit_minutes: number | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          note_id: string
          passing_score?: number | null
          questions: Json
          quiz_type?: string | null
          show_answers_immediately?: boolean | null
          time_limit_minutes?: number | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          note_id?: string
          passing_score?: number | null
          questions?: Json
          quiz_type?: string | null
          show_answers_immediately?: boolean | null
          time_limit_minutes?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_quizzes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_translations: {
        Row: {
          created_at: string | null
          id: string
          note_id: string
          target_language: string
          translated_content: Json
          translated_key_points: string[] | null
          translated_summary: string | null
          translated_title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id: string
          target_language: string
          translated_content: Json
          translated_key_points?: string[] | null
          translated_summary?: string | null
          translated_title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string
          target_language?: string
          translated_content?: Json
          translated_key_points?: string[] | null
          translated_summary?: string | null
          translated_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_translations_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_analytics: {
        Row: {
          avg_relevance_score: number | null
          date: string | null
          id: string
          total_failed: number | null
          total_opened: number | null
          total_queued: number | null
          total_sent: number | null
        }
        Insert: {
          avg_relevance_score?: number | null
          date?: string | null
          id?: string
          total_failed?: number | null
          total_opened?: number | null
          total_queued?: number | null
          total_sent?: number | null
        }
        Update: {
          avg_relevance_score?: number | null
          date?: string | null
          id?: string
          total_failed?: number | null
          total_opened?: number | null
          total_queued?: number | null
          total_sent?: number | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          action_taken: string | null
          id: string
          news_id: string
          opened: boolean | null
          opened_at: string | null
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          id?: string
          news_id: string
          opened?: boolean | null
          opened_at?: string | null
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          id?: string
          news_id?: string
          opened?: boolean | null
          opened_at?: string | null
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          application_id: string
          created_at: string
          deadline_reminders: boolean
          general_enabled: boolean
          id: string
          new_opportunities: boolean
          reminder_days: number[] | null
          status_updates: boolean
          updated_at: string
          updates_enabled: boolean
          urgent_enabled: boolean
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          deadline_reminders?: boolean
          general_enabled?: boolean
          id?: string
          new_opportunities?: boolean
          reminder_days?: number[] | null
          status_updates?: boolean
          updated_at?: string
          updates_enabled?: boolean
          urgent_enabled?: boolean
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          deadline_reminders?: boolean
          general_enabled?: boolean
          id?: string
          new_opportunities?: boolean
          reminder_days?: number[] | null
          status_updates?: boolean
          updated_at?: string
          updates_enabled?: boolean
          urgent_enabled?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          category: string
          created_at: string | null
          deep_link: string | null
          id: string
          news_id: string
          priority: string
          relevance_score: number
          scheduled_for: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          deep_link?: string | null
          id?: string
          news_id: string
          priority: string
          relevance_score: number
          scheduled_for?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          deep_link?: string | null
          id?: string
          news_id?: string
          priority?: string
          relevance_score?: number
          scheduled_for?: string | null
          status?: string | null
          title?: string
          user_id?: string
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
      quiz_attempts: {
        Row: {
          answers: Json
          completed_at: string | null
          correct_answers: number
          id: string
          quiz_id: string
          score: number
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
        }
        Insert: {
          answers: Json
          completed_at?: string | null
          correct_answers: number
          id?: string
          quiz_id: string
          score: number
          time_taken_seconds?: number | null
          total_questions: number
          user_id: string
        }
        Update: {
          answers?: Json
          completed_at?: string | null
          correct_answers?: number
          id?: string
          quiz_id?: string
          score?: number
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "note_quizzes"
            referencedColumns: ["id"]
          },
        ]
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
      session_answers: {
        Row: {
          answer_text: string | null
          answered_at: string | null
          id: string
          is_correct: boolean | null
          participant_id: string | null
          question_id: string | null
          session_id: string | null
          time_taken_ms: number | null
        }
        Insert: {
          answer_text?: string | null
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id?: string | null
          question_id?: string | null
          session_id?: string | null
          time_taken_ms?: number | null
        }
        Update: {
          answer_text?: string | null
          answered_at?: string | null
          id?: string
          is_correct?: boolean | null
          participant_id?: string | null
          question_id?: string | null
          session_id?: string | null
          time_taken_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "session_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          correct_answers: number | null
          current_streak: number | null
          id: string
          joined_at: string | null
          last_answer_at: string | null
          score: number | null
          session_id: string | null
          total_answers: number | null
          user_id: string | null
        }
        Insert: {
          correct_answers?: number | null
          current_streak?: number | null
          id?: string
          joined_at?: string | null
          last_answer_at?: string | null
          score?: number | null
          session_id?: string | null
          total_answers?: number | null
          user_id?: string | null
        }
        Update: {
          correct_answers?: number | null
          current_streak?: number | null
          id?: string
          joined_at?: string | null
          last_answer_at?: string | null
          score?: number | null
          session_id?: string | null
          total_answers?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collaborative_quiz_sessions"
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
      study_notes: {
        Row: {
          audio_english_duration: number | null
          audio_english_url: string | null
          audio_generated_at: string | null
          audio_generation_error: string | null
          audio_generation_status: string | null
          audio_hindi_duration: number | null
          audio_hindi_url: string | null
          audio_last_played_at: string | null
          audio_script_english: Json | null
          audio_script_hindi: Json | null
          created_at: string | null
          current_language: string | null
          estimated_read_time: number | null
          folder_id: string | null
          has_audio: boolean | null
          has_flashcards: boolean | null
          has_quiz: boolean | null
          has_translation: boolean | null
          id: string
          is_favorite: boolean | null
          key_points: string[] | null
          last_accessed_at: string | null
          original_language: string | null
          processing_error: string | null
          processing_progress: number | null
          processing_status: string | null
          raw_content: string | null
          source_audio_duration: number | null
          source_audio_file_size: number | null
          source_audio_format: string | null
          source_filename: string | null
          source_type: string
          source_url: string | null
          storage_path: string | null
          structured_content: Json | null
          summary: string | null
          tags: string[] | null
          title: string
          transcription_confidence: number | null
          transcription_method: string | null
          updated_at: string | null
          user_id: string
          word_count: number | null
        }
        Insert: {
          audio_english_duration?: number | null
          audio_english_url?: string | null
          audio_generated_at?: string | null
          audio_generation_error?: string | null
          audio_generation_status?: string | null
          audio_hindi_duration?: number | null
          audio_hindi_url?: string | null
          audio_last_played_at?: string | null
          audio_script_english?: Json | null
          audio_script_hindi?: Json | null
          created_at?: string | null
          current_language?: string | null
          estimated_read_time?: number | null
          folder_id?: string | null
          has_audio?: boolean | null
          has_flashcards?: boolean | null
          has_quiz?: boolean | null
          has_translation?: boolean | null
          id?: string
          is_favorite?: boolean | null
          key_points?: string[] | null
          last_accessed_at?: string | null
          original_language?: string | null
          processing_error?: string | null
          processing_progress?: number | null
          processing_status?: string | null
          raw_content?: string | null
          source_audio_duration?: number | null
          source_audio_file_size?: number | null
          source_audio_format?: string | null
          source_filename?: string | null
          source_type: string
          source_url?: string | null
          storage_path?: string | null
          structured_content?: Json | null
          summary?: string | null
          tags?: string[] | null
          title: string
          transcription_confidence?: number | null
          transcription_method?: string | null
          updated_at?: string | null
          user_id: string
          word_count?: number | null
        }
        Update: {
          audio_english_duration?: number | null
          audio_english_url?: string | null
          audio_generated_at?: string | null
          audio_generation_error?: string | null
          audio_generation_status?: string | null
          audio_hindi_duration?: number | null
          audio_hindi_url?: string | null
          audio_last_played_at?: string | null
          audio_script_english?: Json | null
          audio_script_hindi?: Json | null
          created_at?: string | null
          current_language?: string | null
          estimated_read_time?: number | null
          folder_id?: string | null
          has_audio?: boolean | null
          has_flashcards?: boolean | null
          has_quiz?: boolean | null
          has_translation?: boolean | null
          id?: string
          is_favorite?: boolean | null
          key_points?: string[] | null
          last_accessed_at?: string | null
          original_language?: string | null
          processing_error?: string | null
          processing_progress?: number | null
          processing_status?: string | null
          raw_content?: string | null
          source_audio_duration?: number | null
          source_audio_file_size?: number | null
          source_audio_format?: string | null
          source_filename?: string | null
          source_type?: string
          source_url?: string | null
          storage_path?: string | null
          structured_content?: Json | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          transcription_confidence?: number | null
          transcription_method?: string | null
          updated_at?: string | null
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "note_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number
          id: string
          items_reviewed: number | null
          note_id: string | null
          session_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds: number
          id?: string
          items_reviewed?: number | null
          note_id?: string | null
          session_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number
          id?: string
          items_reviewed?: number | null
          note_id?: string | null
          session_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "study_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_connections: {
        Row: {
          created_at: string | null
          friend_id: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          friend_id?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_daily_notification_count: {
        Row: {
          count: number | null
          date: string | null
          id: string
          user_id: string
        }
        Insert: {
          count?: number | null
          date?: string | null
          id?: string
          user_id: string
        }
        Update: {
          count?: number | null
          date?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_fcm_tokens: {
        Row: {
          created_at: string | null
          device_info: Json | null
          fcm_token: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          fcm_token: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          fcm_token?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          categories: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          max_daily_notifications: number | null
          priority_threshold: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          categories?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_daily_notifications?: number | null
          priority_threshold?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          categories?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_daily_notifications?: number | null
          priority_threshold?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          date_of_birth: string | null
          display_name: string | null
          email_notifications: boolean | null
          full_name: string | null
          id: string
          last_active_at: string | null
          notifications_enabled: boolean | null
          phone_number: string | null
          photo_url: string | null
          push_notifications: boolean | null
          selected_region: string | null
          theme_mode: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          notifications_enabled?: boolean | null
          phone_number?: string | null
          photo_url?: string | null
          push_notifications?: boolean | null
          selected_region?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_of_birth?: string | null
          display_name?: string | null
          email_notifications?: boolean | null
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          notifications_enabled?: boolean | null
          phone_number?: string | null
          photo_url?: string | null
          push_notifications?: boolean | null
          selected_region?: string | null
          theme_mode?: string | null
          updated_at?: string | null
          user_id?: string
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
          {
            foreignKeyName: "user_story_interactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "story_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      story_analytics: {
        Row: {
          category: string | null
          click_count: number | null
          click_through_rate: number | null
          created_at: string | null
          engagement_score: number | null
          headline: string | null
          id: string | null
          published_date: string | null
          region: string | null
          save_count: number | null
          save_rate: number | null
          share_count: number | null
          view_count: number | null
          views_this_week: number | null
          views_today: number | null
        }
        Insert: {
          category?: string | null
          click_count?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          headline?: string | null
          id?: string | null
          published_date?: string | null
          region?: string | null
          save_count?: number | null
          save_rate?: number | null
          share_count?: number | null
          view_count?: number | null
          views_this_week?: number | null
          views_today?: number | null
        }
        Update: {
          category?: string | null
          click_count?: number | null
          click_through_rate?: number | null
          created_at?: string | null
          engagement_score?: number | null
          headline?: string | null
          id?: string | null
          published_date?: string | null
          region?: string | null
          save_count?: number | null
          save_rate?: number | null
          share_count?: number | null
          view_count?: number | null
          views_this_week?: number | null
          views_today?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_engagement_score: {
        Args: {
          p_save_count: number
          p_share_count: number
          p_view_count: number
        }
        Returns: number
      }
      create_default_note_folders: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_flashcards_due_today: {
        Args: { p_user_id: string }
        Returns: {
          answer: string
          category: string | null
          created_at: string | null
          difficulty: string | null
          ease_factor: number | null
          hint: string | null
          id: string
          interval: number | null
          last_reviewed_at: string | null
          next_review_date: string | null
          note_id: string
          question: string
          repetitions: number | null
          times_correct: number | null
          times_incorrect: number | null
          times_reviewed: number | null
          updated_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "note_flashcards"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_notes_count_by_folder: {
        Args: { p_user_id: string }
        Returns: {
          folder_id: string
          folder_name: string
          notes_count: number
        }[]
      }
      get_notification_stats: { Args: { p_user_id: string }; Returns: Json }
      get_user_daily_count: { Args: { p_user_id: string }; Returns: number }
      increment_daily_notification_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      notify_approaching_deadlines: { Args: never; Returns: undefined }
      reset_daily_notification_counts: { Args: never; Returns: undefined }
      update_flashcard_review: {
        Args: { p_flashcard_id: string; p_quality: number }
        Returns: {
          answer: string
          category: string | null
          created_at: string | null
          difficulty: string | null
          ease_factor: number | null
          hint: string | null
          id: string
          interval: number | null
          last_reviewed_at: string | null
          next_review_date: string | null
          note_id: string
          question: string
          repetitions: number | null
          times_correct: number | null
          times_incorrect: number | null
          times_reviewed: number | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "note_flashcards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
