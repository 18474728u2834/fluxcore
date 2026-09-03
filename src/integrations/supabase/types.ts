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
      account_removal_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_by: string
          requested_by_username: string | null
          responded_at: string | null
          status: string
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by: string
          requested_by_username?: string | null
          responded_at?: string | null
          status?: string
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_by?: string
          requested_by_username?: string | null
          responded_at?: string | null
          status?: string
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      activity_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          roblox_user_id: string
          roblox_username: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          roblox_user_id: string
          roblox_username?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          roblox_user_id?: string
          roblox_username?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_sessions: {
        Row: {
          afk_confirmed_at: string | null
          afk_prompt_at: string | null
          created_at: string
          discard_reason: string | null
          discarded: boolean
          duration_seconds: number | null
          id: string
          idle_seconds: number | null
          joined_at: string
          left_at: string | null
          message_count: number | null
          roblox_user_id: string
          roblox_username: string
          server_id: string | null
          workspace_id: string
        }
        Insert: {
          afk_confirmed_at?: string | null
          afk_prompt_at?: string | null
          created_at?: string
          discard_reason?: string | null
          discarded?: boolean
          duration_seconds?: number | null
          id?: string
          idle_seconds?: number | null
          joined_at?: string
          left_at?: string | null
          message_count?: number | null
          roblox_user_id: string
          roblox_username: string
          server_id?: string | null
          workspace_id: string
        }
        Update: {
          afk_confirmed_at?: string | null
          afk_prompt_at?: string | null
          created_at?: string
          discard_reason?: string | null
          discarded?: boolean
          duration_seconds?: number | null
          id?: string
          idle_seconds?: number | null
          joined_at?: string
          left_at?: string | null
          message_count?: number | null
          roblox_user_id?: string
          roblox_username?: string
          server_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          department_id: string | null
          id: string
          pinned: boolean
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          department_id?: string | null
          id?: string
          pinned?: boolean
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          department_id?: string | null
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_form_questions: {
        Row: {
          correct_answer: string | null
          created_at: string
          form_id: string
          help_text: string | null
          id: string
          label: string
          match_mode: string
          options: Json
          position: number
          required: boolean
          type: string
        }
        Insert: {
          correct_answer?: string | null
          created_at?: string
          form_id: string
          help_text?: string | null
          id?: string
          label: string
          match_mode?: string
          options?: Json
          position?: number
          required?: boolean
          type: string
        }
        Update: {
          correct_answer?: string | null
          created_at?: string
          form_id?: string
          help_text?: string | null
          id?: string
          label?: string
          match_mode?: string
          options?: Json
          position?: number
          required?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "application_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      application_forms: {
        Row: {
          auto_rank_on_accept: boolean
          created_at: string
          created_by: string | null
          description: string | null
          fail_kick_message: string
          id: string
          is_open: boolean
          min_account_age_days: number
          notify_webhook: string | null
          pass_message: string
          pass_rank_number: number | null
          pass_threshold: number
          require_group_member: boolean
          scoring_rules: Json
          slug: string
          target_role_id: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auto_rank_on_accept?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          fail_kick_message?: string
          id?: string
          is_open?: boolean
          min_account_age_days?: number
          notify_webhook?: string | null
          pass_message?: string
          pass_rank_number?: number | null
          pass_threshold?: number
          require_group_member?: boolean
          scoring_rules?: Json
          slug: string
          target_role_id?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auto_rank_on_accept?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          fail_kick_message?: string
          id?: string
          is_open?: boolean
          min_account_age_days?: number
          notify_webhook?: string | null
          pass_message?: string
          pass_rank_number?: number | null
          pass_threshold?: number
          require_group_member?: boolean
          scoring_rules?: Json
          slug?: string
          target_role_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_forms_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          answers: Json
          auto_score: number
          created_at: string
          form_id: string
          id: string
          review_note: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          roblox_user_id: string
          roblox_username: string
          status: string
          workspace_id: string
        }
        Insert: {
          answers?: Json
          auto_score?: number
          created_at?: string
          form_id: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          roblox_user_id: string
          roblox_username: string
          status?: string
          workspace_id: string
        }
        Update: {
          answers?: Json
          auto_score?: number
          created_at?: string
          form_id?: string
          id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          roblox_user_id?: string
          roblox_username?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "application_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      creations: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          image_path: string | null
          name: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          image_path?: string | null
          name: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          image_path?: string | null
          name?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          requested_by: string
          status: string
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          requested_by: string
          status?: string
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          requested_by?: string
          status?: string
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      department_leads: {
        Row: {
          created_at: string
          department_id: string
          id: string
          member_id: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          member_id: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_leads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_leads_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
        ]
      }
      department_members: {
        Row: {
          created_at: string
          department_id: string
          id: string
          member_id: string
          role: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          member_id: string
          role?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          member_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "department_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          hero_image_url: string | null
          icon: string | null
          id: string
          name: string
          primary_color: string | null
          slug: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          id?: string
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          icon?: string | null
          id?: string
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_bot_logs: {
        Row: {
          command: string
          created_at: string
          discord_user_id: string
          discord_username: string | null
          error: string | null
          guild_id: string
          id: string
          options: Json | null
          result: string
          workspace_id: string | null
        }
        Insert: {
          command: string
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          error?: string | null
          guild_id: string
          id?: string
          options?: Json | null
          result: string
          workspace_id?: string | null
        }
        Update: {
          command?: string
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          error?: string | null
          guild_id?: string
          id?: string
          options?: Json | null
          result?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_bot_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_command_sessions: {
        Row: {
          consumed_at: string | null
          created_at: string
          discord_user_id: string
          discord_username: string | null
          expires_at: string
          guild_id: string
          id: string
          token: string
          workspace_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          expires_at: string
          guild_id: string
          id?: string
          token: string
          workspace_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          expires_at?: string
          guild_id?: string
          id?: string
          token?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discord_command_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_links: {
        Row: {
          created_at: string
          discord_user_id: string
          discord_username: string | null
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          discord_user_id: string
          discord_username?: string | null
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          discord_user_id?: string
          discord_username?: string | null
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_pending_links: {
        Row: {
          created_at: string
          discord_user_id: string
          discord_username: string
          expires_at: string
          token: string
        }
        Insert: {
          created_at?: string
          discord_user_id: string
          discord_username: string
          expires_at?: string
          token: string
        }
        Update: {
          created_at?: string
          discord_user_id?: string
          discord_username?: string
          expires_at?: string
          token?: string
        }
        Relationships: []
      }
      dismissed_announcements: {
        Row: {
          announcement_id: string
          dismissed_at: string
          id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      document_signatures: {
        Row: {
          document_id: string
          id: string
          member_id: string | null
          signature_data: string | null
          signed_at: string
          user_id: string
        }
        Insert: {
          document_id: string
          id?: string
          member_id?: string | null
          signature_data?: string | null
          signed_at?: string
          user_id: string
        }
        Update: {
          document_id?: string
          id?: string
          member_id?: string | null
          signature_data?: string | null
          signed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "workspace_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          roblox_username: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          roblox_username: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          roblox_username?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "feedback_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_tickets: {
        Row: {
          created_at: string
          description: string
          id: string
          roblox_username: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          roblox_username: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          roblox_username?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fluxcore_blacklist: {
        Row: {
          blacklisted_by: string
          blacklisted_by_username: string | null
          created_at: string
          id: string
          reason: string | null
          roblox_user_id: string
          roblox_username: string
        }
        Insert: {
          blacklisted_by: string
          blacklisted_by_username?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          roblox_user_id: string
          roblox_username: string
        }
        Update: {
          blacklisted_by?: string
          blacklisted_by_username?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          roblox_user_id?: string
          roblox_username?: string
        }
        Relationships: []
      }
      kudos: {
        Row: {
          created_at: string
          from_member_id: string | null
          from_name: string
          from_user_id: string
          id: string
          message: string
          to_member_id: string
          to_name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          from_member_id?: string | null
          from_name: string
          from_user_id: string
          id?: string
          message: string
          to_member_id: string
          to_name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          from_member_id?: string | null
          from_name?: string
          from_user_id?: string
          id?: string
          message?: string
          to_member_id?: string
          to_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_from_member_id_fkey"
            columns: ["from_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_to_member_id_fkey"
            columns: ["to_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kudos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      loa_requests: {
        Row: {
          created_at: string
          department_id: string | null
          end_date: string
          id: string
          member_id: string
          reason: string
          reviewed_by: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          end_date: string
          id?: string
          member_id: string
          reason: string
          reviewed_by?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          end_date?: string
          id?: string
          member_id?: string
          reason?: string
          reviewed_by?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loa_requests_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loa_requests_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loa_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      member_logs: {
        Row: {
          author_id: string
          author_name: string
          content: string
          created_at: string
          department_id: string | null
          id: string
          log_type: string
          member_id: string
          workspace_id: string
        }
        Insert: {
          author_id: string
          author_name: string
          content: string
          created_at?: string
          department_id?: string | null
          id?: string
          log_type?: string
          member_id: string
          workspace_id: string
        }
        Update: {
          author_id?: string
          author_name?: string
          content?: string
          created_at?: string
          department_id?: string | null
          id?: string
          log_type?: string
          member_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_logs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      nexus_v3_trials: {
        Row: {
          created_at: string
          enabled_by: string | null
          note: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled_by?: string | null
          note?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled_by?: string | null
          note?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexus_v3_trials_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_portals: {
        Row: {
          accent_color: string | null
          auto_created: boolean
          closed_reason: string | null
          created_at: string
          created_by: string
          id: string
          last_active_at: string
          links: Json
          logo_url: string | null
          name: string
          portal_theme: string
          roblox_group_url: string | null
          status: string
          subdomain: string
          tagline: string | null
          updated_at: string
          use_hyra_ui: boolean
          workspace_id: string
        }
        Insert: {
          accent_color?: string | null
          auto_created?: boolean
          closed_reason?: string | null
          created_at?: string
          created_by: string
          id?: string
          last_active_at?: string
          links?: Json
          logo_url?: string | null
          name: string
          portal_theme?: string
          roblox_group_url?: string | null
          status?: string
          subdomain: string
          tagline?: string | null
          updated_at?: string
          use_hyra_ui?: boolean
          workspace_id: string
        }
        Update: {
          accent_color?: string | null
          auto_created?: boolean
          closed_reason?: string | null
          created_at?: string
          created_by?: string
          id?: string
          last_active_at?: string
          links?: Json
          logo_url?: string | null
          name?: string
          portal_theme?: string
          roblox_group_url?: string | null
          status?: string
          subdomain?: string
          tagline?: string | null
          updated_at?: string
          use_hyra_ui?: boolean
          workspace_id?: string
        }
        Relationships: []
      }
      premium_grant_claims: {
        Row: {
          claimed_at: string
          days: number
          grant_id: string
          id: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          claimed_at?: string
          days: number
          grant_id: string
          id?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          claimed_at?: string
          days?: number
          grant_id?: string
          id?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "premium_grant_claims_grant_id_fkey"
            columns: ["grant_id"]
            isOneToOne: false
            referencedRelation: "premium_grants"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_grants: {
        Row: {
          created_at: string
          created_by: string
          days: number
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number
          token: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by: string
          days?: number
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number
          token?: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          days?: number
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number
          token?: string
          uses?: number
        }
        Relationships: []
      }
      promotion_nominations: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decided_by_name: string | null
          decision_note: string | null
          id: string
          nominator_member_id: string | null
          nominator_name: string
          nominator_user_id: string
          nominee_member_id: string
          nominee_name: string
          reason: string
          status: string
          suggested_rank: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision_note?: string | null
          id?: string
          nominator_member_id?: string | null
          nominator_name: string
          nominator_user_id: string
          nominee_member_id: string
          nominee_name: string
          reason: string
          status?: string
          suggested_rank?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decided_by_name?: string | null
          decision_note?: string | null
          id?: string
          nominator_member_id?: string | null
          nominator_name?: string
          nominator_user_id?: string
          nominee_member_id?: string
          nominee_name?: string
          reason?: string
          status?: string
          suggested_rank?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_nominations_nominator_member_id_fkey"
            columns: ["nominator_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_nominations_nominee_member_id_fkey"
            columns: ["nominee_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_nominations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      roblox_verification_challenges: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          username_lower: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          username_lower: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          username_lower?: string
        }
        Relationships: []
      }
      scheduled_sessions: {
        Row: {
          aircraft_model: string | null
          category: string
          co_host_name: string | null
          created_at: string
          department_id: string | null
          description: string | null
          destination: string | null
          duration_minutes: number
          game_url: string | null
          host_id: string | null
          host_name: string
          id: string
          occurrence_assignments: Json
          origin: string | null
          recurring: string | null
          recurring_days: string[] | null
          recurring_time: string | null
          role_labels: Json | null
          route_number: string | null
          scheduled_at: string
          slots: Json | null
          status: string
          tag_ids: string[] | null
          tail_number: string | null
          title: string
          trainer_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          aircraft_model?: string | null
          category?: string
          co_host_name?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          destination?: string | null
          duration_minutes?: number
          game_url?: string | null
          host_id?: string | null
          host_name: string
          id?: string
          occurrence_assignments?: Json
          origin?: string | null
          recurring?: string | null
          recurring_days?: string[] | null
          recurring_time?: string | null
          role_labels?: Json | null
          route_number?: string | null
          scheduled_at: string
          slots?: Json | null
          status?: string
          tag_ids?: string[] | null
          tail_number?: string | null
          title: string
          trainer_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          aircraft_model?: string | null
          category?: string
          co_host_name?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          destination?: string | null
          duration_minutes?: number
          game_url?: string | null
          host_id?: string | null
          host_name?: string
          id?: string
          occurrence_assignments?: Json
          origin?: string | null
          recurring?: string | null
          recurring_days?: string[] | null
          recurring_time?: string | null
          role_labels?: Json | null
          route_number?: string | null
          scheduled_at?: string
          slots?: Json | null
          status?: string
          tag_ids?: string[] | null
          tail_number?: string | null
          title?: string
          trainer_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      security_scans: {
        Row: {
          created_at: string
          critical_count: number
          duration_ms: number | null
          findings: Json
          id: string
          info_count: number
          scan_type: string
          status: string
          triggered_by: string
          warning_count: number
        }
        Insert: {
          created_at?: string
          critical_count?: number
          duration_ms?: number | null
          findings?: Json
          id?: string
          info_count?: number
          scan_type?: string
          status?: string
          triggered_by?: string
          warning_count?: number
        }
        Update: {
          created_at?: string
          critical_count?: number
          duration_ms?: number | null
          findings?: Json
          id?: string
          info_count?: number
          scan_type?: string
          status?: string
          triggered_by?: string
          warning_count?: number
        }
        Relationships: []
      }
      session_attendance: {
        Row: {
          created_at: string
          id: string
          member_id: string | null
          minutes_present: number
          occurrence_at: string
          roblox_user_id: string
          roblox_username: string | null
          session_id: string
          verified_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id?: string | null
          minutes_present?: number
          occurrence_at: string
          roblox_user_id: string
          roblox_username?: string | null
          session_id: string
          verified_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string | null
          minutes_present?: number
          occurrence_at?: string
          roblox_user_id?: string
          roblox_username?: string | null
          session_id?: string
          verified_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_attendance_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_crew_assignments: {
        Row: {
          assigned_by: string | null
          assigned_by_name: string | null
          created_at: string
          crew_role: string
          id: string
          member_id: string | null
          notified_at: string | null
          notify_error: string | null
          occurrence_at: string
          roblox_username: string
          session_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          created_at?: string
          crew_role: string
          id?: string
          member_id?: string | null
          notified_at?: string | null
          notify_error?: string | null
          occurrence_at: string
          roblox_username: string
          session_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assigned_by?: string | null
          assigned_by_name?: string | null
          created_at?: string
          crew_role?: string
          id?: string
          member_id?: string | null
          notified_at?: string | null
          notify_error?: string | null
          occurrence_at?: string
          roblox_username?: string
          session_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_crew_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_crew_assignments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_crew_assignments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_crew_preferences: {
        Row: {
          availability: string
          created_at: string
          id: string
          member_id: string | null
          note: string | null
          occurrence_at: string
          preferred_roles: Json
          roblox_username: string
          session_id: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          availability?: string
          created_at?: string
          id?: string
          member_id?: string | null
          note?: string | null
          occurrence_at: string
          preferred_roles?: Json
          roblox_username: string
          session_id: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          availability?: string
          created_at?: string
          id?: string
          member_id?: string | null
          note?: string | null
          occurrence_at?: string
          preferred_roles?: Json
          roblox_username?: string
          session_id?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_crew_preferences_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_crew_preferences_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_crew_preferences_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notifications: {
        Row: {
          action: string
          created_at: string
          id: string
          occurrence_at: string
          sent_at: string
          session_id: string
          workspace_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          id?: string
          occurrence_at: string
          sent_at?: string
          session_id: string
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          occurrence_at?: string
          sent_at?: string
          session_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notifications_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scheduled_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      session_tags: {
        Row: {
          category: string
          color: string
          created_at: string
          id: string
          name: string
          workspace_id: string
        }
        Insert: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          name: string
          workspace_id: string
        }
        Update: {
          category?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          workspace_id?: string
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          level: string
          link_label: string | null
          link_url: string | null
          message: string
          placement: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          level?: string
          link_label?: string | null
          link_url?: string | null
          message: string
          placement?: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          level?: string
          link_label?: string | null
          link_url?: string | null
          message?: string
          placement?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_designs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sections: Json
          target: string
          theme: Json
          ui_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          sections?: Json
          target?: string
          theme?: Json
          ui_label?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sections?: Json
          target?: string
          theme?: Json
          ui_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      sso_handoff_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          return_origin: string
          token: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          return_origin: string
          token: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          return_origin?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_admins: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          roblox_username: string
          role: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          roblox_username: string
          role?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          roblox_username?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          admin_username: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          admin_username?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          admin_username?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          admin_id: string
          granted_at: string
          id: string
          permission: string
        }
        Insert: {
          admin_id: string
          granted_at?: string
          id?: string
          permission: string
        }
        Update: {
          admin_id?: string
          granted_at?: string
          id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "staff_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      status_checks: {
        Row: {
          checked_at: string
          component_id: string
          id: number
          latency_ms: number | null
          source: string
          status: string
        }
        Insert: {
          checked_at?: string
          component_id: string
          id?: number
          latency_ms?: number | null
          source?: string
          status: string
        }
        Update: {
          checked_at?: string
          component_id?: string
          id?: number
          latency_ms?: number | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_checks_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "status_components"
            referencedColumns: ["id"]
          },
        ]
      }
      status_components: {
        Row: {
          check_url: string | null
          created_at: string
          current_status: string
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          check_url?: string | null
          created_at?: string
          current_status?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          check_url?: string | null
          created_at?: string
          current_status?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      status_incident_components: {
        Row: {
          affected_status: string
          component_id: string
          incident_id: string
        }
        Insert: {
          affected_status?: string
          component_id: string
          incident_id: string
        }
        Update: {
          affected_status?: string
          component_id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_incident_components_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "status_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "status_incident_components_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "status_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      status_incident_updates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          incident_id: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id: string
          status: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          incident_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_incident_updates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "status_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      status_incidents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          resolved_at: string | null
          severity: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_maintenance: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          scheduled_end: string
          scheduled_start: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_end: string
          scheduled_start: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          roblox_username: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          roblox_username: string
          ticket_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          roblox_username?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          roblox_username: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          roblox_username: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          roblox_username?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_birthdays: {
        Row: {
          birthday_day: number
          birthday_month: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birthday_day: number
          birthday_month: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birthday_day?: number
          birthday_month?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          ui_version: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ui_version?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ui_version?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verified_users: {
        Row: {
          discord_user_id: string | null
          discord_username: string | null
          has_gamepass: boolean
          id: string
          roblox_user_id: string
          roblox_username: string
          user_id: string
          verified_at: string
        }
        Insert: {
          discord_user_id?: string | null
          discord_username?: string | null
          has_gamepass?: boolean
          id?: string
          roblox_user_id: string
          roblox_username: string
          user_id: string
          verified_at?: string
        }
        Update: {
          discord_user_id?: string | null
          discord_username?: string | null
          has_gamepass?: boolean
          id?: string
          roblox_user_id?: string
          roblox_username?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: []
      }
      webhook_templates: {
        Row: {
          advanced_mode: boolean
          avatar_url: string | null
          category: string
          color: string
          content: string | null
          created_at: string
          description: string
          embeds: Json
          id: string
          image_position: string
          image_url: string | null
          link_label: string
          link_mode: string
          link_position: string
          plain_message: string | null
          show_claims: boolean
          show_host: boolean
          show_time: boolean
          title: string
          updated_at: string
          use_embed: boolean
          username: string | null
          workspace_id: string
        }
        Insert: {
          advanced_mode?: boolean
          avatar_url?: string | null
          category: string
          color?: string
          content?: string | null
          created_at?: string
          description?: string
          embeds?: Json
          id?: string
          image_position?: string
          image_url?: string | null
          link_label?: string
          link_mode?: string
          link_position?: string
          plain_message?: string | null
          show_claims?: boolean
          show_host?: boolean
          show_time?: boolean
          title?: string
          updated_at?: string
          use_embed?: boolean
          username?: string | null
          workspace_id: string
        }
        Update: {
          advanced_mode?: boolean
          avatar_url?: string | null
          category?: string
          color?: string
          content?: string | null
          created_at?: string
          description?: string
          embeds?: Json
          id?: string
          image_position?: string
          image_url?: string | null
          link_label?: string
          link_mode?: string
          link_position?: string
          plain_message?: string | null
          show_claims?: boolean
          show_host?: boolean
          show_time?: boolean
          title?: string
          updated_at?: string
          use_embed?: boolean
          username?: string | null
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_blacklist: {
        Row: {
          blacklisted_at: string
          blacklisted_by: string
          id: string
          reason: string | null
          roblox_user_id: string
          roblox_username: string
          workspace_id: string
        }
        Insert: {
          blacklisted_at?: string
          blacklisted_by: string
          id?: string
          reason?: string | null
          roblox_user_id: string
          roblox_username: string
          workspace_id: string
        }
        Update: {
          blacklisted_at?: string
          blacklisted_by?: string
          id?: string
          reason?: string | null
          roblox_user_id?: string
          roblox_username?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_blacklist_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_discord_guilds: {
        Row: {
          created_at: string
          guild_id: string
          id: string
          installed_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          guild_id: string
          id?: string
          installed_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          guild_id?: string
          id?: string
          installed_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_discord_guilds_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_documents: {
        Row: {
          assign_to: string
          auto_assign: boolean
          content: string
          created_at: string
          created_by: string
          deadline: string | null
          department_id: string | null
          doc_type: string
          external_url: string | null
          id: string
          signature_type: string
          signature_word: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assign_to?: string
          auto_assign?: boolean
          content: string
          created_at?: string
          created_by: string
          deadline?: string | null
          department_id?: string | null
          doc_type?: string
          external_url?: string | null
          id?: string
          signature_type?: string
          signature_word?: string | null
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assign_to?: string
          auto_assign?: boolean
          content?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          department_id?: string | null
          doc_type?: string
          external_url?: string | null
          id?: string
          signature_type?: string
          signature_word?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          access_key: string
          birthday_day: number | null
          birthday_month: number | null
          discord_user_id: string | null
          id: string
          joined_at: string
          roblox_group_rank: number | null
          roblox_user_id: string
          roblox_username: string
          role: string
          role_id: string | null
          updated_at: string
          user_id: string | null
          verified: boolean
          workspace_id: string
        }
        Insert: {
          access_key?: string
          birthday_day?: number | null
          birthday_month?: number | null
          discord_user_id?: string | null
          id?: string
          joined_at?: string
          roblox_group_rank?: number | null
          roblox_user_id: string
          roblox_username: string
          role?: string
          role_id?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          workspace_id: string
        }
        Update: {
          access_key?: string
          birthday_day?: number | null
          birthday_month?: number | null
          discord_user_id?: string | null
          id?: string
          joined_at?: string
          roblox_group_rank?: number | null
          roblox_user_id?: string
          roblox_username?: string
          role?: string
          role_id?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_permissions: {
        Row: {
          granted_at: string
          id: string
          member_id: string
          permission: string
          workspace_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          member_id: string
          permission: string
          workspace_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          member_id?: string
          permission?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_quotas: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          last_reset_at: string
          period: string
          quota_type: string
          role_id: string | null
          target_value: number
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          last_reset_at?: string
          period?: string
          quota_type?: string
          role_id?: string | null
          target_value?: number
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          last_reset_at?: string
          period?: string
          quota_type?: string
          role_id?: string | null
          target_value?: number
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_quotas_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_quotas_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "workspace_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_quotas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_roles: {
        Row: {
          color: string
          created_at: string
          department_id: string | null
          id: string
          name: string
          permissions: Json
          position: number
          roblox_role_id: string | null
          workspace_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          department_id?: string | null
          id?: string
          name: string
          permissions?: Json
          position?: number
          roblox_role_id?: string | null
          workspace_id: string
        }
        Update: {
          color?: string
          created_at?: string
          department_id?: string | null
          id?: string
          name?: string
          permissions?: Json
          position?: number
          roblox_role_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          afk_confirm_seconds: number | null
          api_key_enc: string | null
          api_key_hash: string | null
          app_center_api_key_hash: string | null
          auto_rank_enabled: boolean | null
          background_color: string | null
          closed_at: string | null
          closed_reason: string | null
          created_at: string
          discord_webhook_url_enc: string | null
          dispatch_enabled: boolean
          dispatch_roles: Json
          game_url: string | null
          gamepass_id: string | null
          id: string
          invite_code: string
          leaderboard_categories: Json
          marquee_featured: boolean
          message_logger_enabled: boolean | null
          name: string
          nexus_config: Json
          nexus_hero_image_url: string | null
          owner_id: string
          premium: boolean
          premium_until: string | null
          primary_color: string | null
          quota_log_configured: boolean
          quota_log_mode: string
          quota_log_webhook_url_enc: string | null
          rankgun_api_key_enc: string | null
          release_version: string | null
          roblox_api_key_enc: string | null
          roblox_group_id: string | null
          session_role_labels: Json
          show_grid: boolean | null
          subdomain_grace_until: string
          text_color: string | null
          tutorial_completed: boolean
          updated_at: string
          verified_official: boolean
        }
        Insert: {
          afk_confirm_seconds?: number | null
          api_key_enc?: string | null
          api_key_hash?: string | null
          app_center_api_key_hash?: string | null
          auto_rank_enabled?: boolean | null
          background_color?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          discord_webhook_url_enc?: string | null
          dispatch_enabled?: boolean
          dispatch_roles?: Json
          game_url?: string | null
          gamepass_id?: string | null
          id?: string
          invite_code?: string
          leaderboard_categories?: Json
          marquee_featured?: boolean
          message_logger_enabled?: boolean | null
          name: string
          nexus_config?: Json
          nexus_hero_image_url?: string | null
          owner_id: string
          premium?: boolean
          premium_until?: string | null
          primary_color?: string | null
          quota_log_configured?: boolean
          quota_log_mode?: string
          quota_log_webhook_url_enc?: string | null
          rankgun_api_key_enc?: string | null
          release_version?: string | null
          roblox_api_key_enc?: string | null
          roblox_group_id?: string | null
          session_role_labels?: Json
          show_grid?: boolean | null
          subdomain_grace_until?: string
          text_color?: string | null
          tutorial_completed?: boolean
          updated_at?: string
          verified_official?: boolean
        }
        Update: {
          afk_confirm_seconds?: number | null
          api_key_enc?: string | null
          api_key_hash?: string | null
          app_center_api_key_hash?: string | null
          auto_rank_enabled?: boolean | null
          background_color?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          created_at?: string
          discord_webhook_url_enc?: string | null
          dispatch_enabled?: boolean
          dispatch_roles?: Json
          game_url?: string | null
          gamepass_id?: string | null
          id?: string
          invite_code?: string
          leaderboard_categories?: Json
          marquee_featured?: boolean
          message_logger_enabled?: boolean | null
          name?: string
          nexus_config?: Json
          nexus_hero_image_url?: string | null
          owner_id?: string
          premium?: boolean
          premium_until?: string | null
          primary_color?: string | null
          quota_log_configured?: boolean
          quota_log_mode?: string
          quota_log_webhook_url_enc?: string | null
          rankgun_api_key_enc?: string | null
          release_version?: string | null
          roblox_api_key_enc?: string | null
          roblox_group_id?: string | null
          session_role_labels?: Json
          show_grid?: boolean | null
          subdomain_grace_until?: string
          text_color?: string | null
          tutorial_completed?: boolean
          updated_at?: string
          verified_official?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_grant_to_workspace: {
        Args: { _grant_id: string; _workspace_id: string }
        Returns: boolean
      }
      bind_discord_account: { Args: { _token: string }; Returns: Json }
      bootstrap_service_role_key: { Args: { _key: string }; Returns: undefined }
      calculate_session_duration: {
        Args: { ws_id: string }
        Returns: undefined
      }
      can_manage_department: {
        Args: { _department_id: string }
        Returns: boolean
      }
      can_see_department_row: {
        Args: { _department_id: string; _workspace_id: string }
        Returns: boolean
      }
      claim_premium_grant: {
        Args: { _token: string }
        Returns: {
          days: number
          grant_id: string
        }[]
      }
      cron_invoke_edge: {
        Args: { body?: Json; fn_name: string }
        Returns: number
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      department_workspace_id: {
        Args: { _department_id: string }
        Returns: string
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_accessible_departments: {
        Args: never
        Returns: {
          hero_image_url: string
          icon: string
          id: string
          is_lead: boolean
          name: string
          primary_color: string
          slug: string
          workspace_id: string
        }[]
      }
      get_accessible_workspaces: {
        Args: never
        Returns: {
          background_color: string
          id: string
          name: string
          owner_id: string
          primary_color: string
          roblox_group_id: string
          role: string
          show_grid: boolean
          text_color: string
          verified_official: boolean
        }[]
      }
      get_nexus_config: { Args: { _workspace_id: string }; Returns: Json }
      get_public_form: { Args: { _form_id: string }; Returns: Json }
      get_workspace_context: {
        Args: { _workspace_id: string }
        Returns: {
          background_color: string
          discord_webhook_url: string
          game_url: string
          gamepass_id: string
          id: string
          name: string
          nexus_hero_image_url: string
          owner_id: string
          premium: boolean
          premium_until: string
          primary_color: string
          roblox_group_id: string
          session_role_labels: Json
          show_grid: boolean
          text_color: string
          tutorial_completed: boolean
          verified_official: boolean
        }[]
      }
      get_workspace_integration_status: {
        Args: { _workspace_id: string }
        Returns: {
          has_discord_webhook: boolean
          has_rankgun_api_key: boolean
          has_roblox_api_key: boolean
          quota_log_configured: boolean
          quota_log_mode: string
        }[]
      }
      get_workspace_owner_info: {
        Args: { _workspace_id: string }
        Returns: {
          owner_id: string
          roblox_user_id: string
          roblox_username: string
        }[]
      }
      get_workspace_secrets: {
        Args: { _workspace_id: string }
        Returns: {
          api_key: string
          discord_webhook_url: string
          quota_log_webhook_url: string
          rankgun_api_key: string
          roblox_api_key: string
        }[]
      }
      has_staff_permission: { Args: { _perm: string }; Returns: boolean }
      has_workspace_permission: {
        Args: { _permission: string; _workspace_id: string }
        Returns: boolean
      }
      heartbeat_portal: { Args: { _workspace_id: string }; Returns: undefined }
      internal_answer_matches: {
        Args: { _ans: string; _correct: string; _mode: string }
        Returns: boolean
      }
      internal_app_center_grade: {
        Args: {
          _answers: Json
          _form_id: string
          _roblox_user_id: string
          _roblox_username: string
          _workspace_id: string
        }
        Returns: Json
      }
      internal_app_center_list_forms: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      internal_discord_resolve_user: {
        Args: { _discord_user_id: string; _guild_id: string }
        Returns: {
          user_id: string
          workspace_id: string
        }[]
      }
      internal_discord_workspace_for_guild: {
        Args: { _guild_id: string }
        Returns: string
      }
      internal_get_workspace_secrets: {
        Args: { _workspace_id: string }
        Returns: {
          api_key: string
          discord_webhook_url: string
          quota_log_webhook_url: string
          rankgun_api_key: string
          roblox_api_key: string
        }[]
      }
      internal_member_has_permission: {
        Args: { _permission: string; _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      internal_workspace_by_app_center_key: {
        Args: { _api_key: string }
        Returns: {
          workspace_id: string
          workspace_name: string
        }[]
      }
      internal_workspace_id_by_api_key: {
        Args: { _api_key: string }
        Returns: string
      }
      is_department_lead: { Args: { _department_id: string }; Returns: boolean }
      is_department_member: {
        Args: { _department_id: string }
        Returns: boolean
      }
      is_fluxcore_staff: { Args: never; Returns: boolean }
      is_staff_admin: { Args: never; Returns: boolean }
      is_staff_owner_admin: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
      join_workspace_with_invite: {
        Args: {
          _roblox_user_id?: string
          _roblox_username?: string
          code: string
        }
        Returns: string
      }
      lookup_workspace_by_invite: {
        Args: { code: string }
        Returns: {
          id: string
          name: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      rotate_app_center_key: {
        Args: { _workspace_id: string }
        Returns: string
      }
      set_nexus_config: {
        Args: { _config: Json; _workspace_id: string }
        Returns: Json
      }
      set_workspace_secrets: {
        Args: { _values: Json; _workspace_id: string }
        Returns: undefined
      }
      submit_application: {
        Args: {
          _answers: Json
          _form_id: string
          _roblox_user_id: string
          _roblox_username: string
        }
        Returns: string
      }
      sweep_dormant_portals: { Args: never; Returns: number }
      sync_my_memberships: { Args: never; Returns: number }
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
    Enums: {},
  },
} as const
