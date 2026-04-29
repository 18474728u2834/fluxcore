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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
          id?: string
          pinned?: boolean
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          document_id: string
          id: string
          member_id: string
          signature_data: string | null
          signed_at: string
          user_id: string
        }
        Insert: {
          document_id: string
          id?: string
          member_id: string
          signature_data?: string | null
          signed_at?: string
          user_id: string
        }
        Update: {
          document_id?: string
          id?: string
          member_id?: string
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
      loa_requests: {
        Row: {
          created_at: string
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
          id?: string
          log_type?: string
          member_id?: string
          workspace_id?: string
        }
        Relationships: [
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
      scheduled_sessions: {
        Row: {
          category: string
          co_host_name: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          host_id: string | null
          host_name: string
          id: string
          recurring: string | null
          scheduled_at: string
          status: string
          title: string
          trainer_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string
          co_host_name?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id?: string | null
          host_name: string
          id?: string
          recurring?: string | null
          scheduled_at: string
          status?: string
          title: string
          trainer_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string
          co_host_name?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          host_id?: string | null
          host_name?: string
          id?: string
          recurring?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          trainer_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      verified_users: {
        Row: {
          has_gamepass: boolean
          id: string
          roblox_user_id: string
          roblox_username: string
          user_id: string
          verified_at: string
        }
        Insert: {
          has_gamepass?: boolean
          id?: string
          roblox_user_id: string
          roblox_username: string
          user_id: string
          verified_at?: string
        }
        Update: {
          has_gamepass?: boolean
          id?: string
          roblox_user_id?: string
          roblox_username?: string
          user_id?: string
          verified_at?: string
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
      workspace_documents: {
        Row: {
          assign_to: string
          auto_assign: boolean
          content: string
          created_at: string
          created_by: string
          deadline: string | null
          doc_type: string
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
          doc_type?: string
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
          doc_type?: string
          id?: string
          signature_type?: string
          signature_word?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
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
          id: string
          period: string
          quota_type: string
          role_id: string | null
          target_value: number
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period?: string
          quota_type?: string
          role_id?: string | null
          target_value?: number
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period?: string
          quota_type?: string
          role_id?: string | null
          target_value?: number
          title?: string
          workspace_id?: string
        }
        Relationships: [
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
          id?: string
          name?: string
          permissions?: Json
          position?: number
          roblox_role_id?: string | null
          workspace_id?: string
        }
        Relationships: [
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
          api_key: string
          auto_rank_enabled: boolean | null
          background_color: string | null
          created_at: string
          discord_webhook_url: string | null
          gamepass_id: string | null
          id: string
          invite_code: string
          message_logger_enabled: boolean | null
          name: string
          owner_id: string
          premium: boolean
          premium_until: string | null
          primary_color: string | null
          release_version: string | null
          roblox_api_key: string | null
          roblox_group_id: string | null
          show_grid: boolean | null
          text_color: string | null
          tutorial_completed: boolean
          updated_at: string
          verified_official: boolean
        }
        Insert: {
          api_key?: string
          auto_rank_enabled?: boolean | null
          background_color?: string | null
          created_at?: string
          discord_webhook_url?: string | null
          gamepass_id?: string | null
          id?: string
          invite_code?: string
          message_logger_enabled?: boolean | null
          name: string
          owner_id: string
          premium?: boolean
          premium_until?: string | null
          primary_color?: string | null
          release_version?: string | null
          roblox_api_key?: string | null
          roblox_group_id?: string | null
          show_grid?: boolean | null
          text_color?: string | null
          tutorial_completed?: boolean
          updated_at?: string
          verified_official?: boolean
        }
        Update: {
          api_key?: string
          auto_rank_enabled?: boolean | null
          background_color?: string | null
          created_at?: string
          discord_webhook_url?: string | null
          gamepass_id?: string | null
          id?: string
          invite_code?: string
          message_logger_enabled?: boolean | null
          name?: string
          owner_id?: string
          premium?: boolean
          premium_until?: string | null
          primary_color?: string | null
          release_version?: string | null
          roblox_api_key?: string | null
          roblox_group_id?: string | null
          show_grid?: boolean | null
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
      calculate_session_duration: {
        Args: { ws_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
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
      get_workspace_context: {
        Args: { _workspace_id: string }
        Returns: {
          background_color: string
          gamepass_id: string
          id: string
          name: string
          owner_id: string
          premium: boolean
          premium_until: string
          primary_color: string
          roblox_group_id: string
          show_grid: boolean
          text_color: string
          tutorial_completed: boolean
          verified_official: boolean
        }[]
      }
      has_workspace_permission: {
        Args: { _permission: string; _workspace_id: string }
        Returns: boolean
      }
      is_fluxcore_staff: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
      is_workspace_owner: { Args: { _workspace_id: string }; Returns: boolean }
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
