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
      admin_activity_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by_admin_id: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by_admin_id?: string | null
        }
        Relationships: []
      }
      boost_pricing: {
        Row: {
          active: boolean
          boost_type: string
          created_at: string
          credits_required: number
          duration_hours: number
          id: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          boost_type: string
          created_at?: string
          credits_required: number
          duration_hours: number
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          boost_type?: string
          created_at?: string
          credits_required?: number
          duration_hours?: number
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          boost_type: string
          created_at: string
          credits_spent: number
          entity_id: string
          entity_type: string
          expires_at: string
          id: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          boost_type: string
          created_at?: string
          credits_spent: number
          entity_id: string
          entity_type: string
          expires_at: string
          id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          boost_type?: string
          created_at?: string
          credits_spent?: number
          entity_id?: string
          entity_type?: string
          expires_at?: string
          id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      business_followers: {
        Row: {
          business_page_id: string
          created_at: string
          follower_id: string
        }
        Insert: {
          business_page_id: string
          created_at?: string
          follower_id: string
        }
        Update: {
          business_page_id?: string
          created_at?: string
          follower_id?: string
        }
        Relationships: []
      }
      business_pages: {
        Row: {
          address: string | null
          area: string | null
          category_slug: string | null
          claim_status: string
          contact_phone: string | null
          country: string | null
          cover_url: string | null
          created_at: string
          description: string
          district: string | null
          email: string | null
          id: string
          is_featured: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          opening_hours: Json
          org_type: string
          owner_id: string
          products: string[]
          region: string | null
          seeded_by_official: boolean
          services: string[]
          slug: string
          subcategory: string | null
          suspended: boolean
          town: string | null
          updated_at: string
          verified: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          category_slug?: string | null
          claim_status?: string
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json
          org_type?: string
          owner_id: string
          products?: string[]
          region?: string | null
          seeded_by_official?: boolean
          services?: string[]
          slug: string
          subcategory?: string | null
          suspended?: boolean
          town?: string | null
          updated_at?: string
          verified?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          category_slug?: string | null
          claim_status?: string
          contact_phone?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json
          org_type?: string
          owner_id?: string
          products?: string[]
          region?: string | null
          seeded_by_official?: boolean
          services?: string[]
          slug?: string
          subcategory?: string | null
          suspended?: boolean
          town?: string | null
          updated_at?: string
          verified?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      contact_logs: {
        Row: {
          clicked_at: string
          contact_method: string
          created_at: string
          customer_id: string
          id: string
          is_urgent: boolean
          provider_id: string
          service_id: string | null
          service_job_id: string | null
          service_request_id: string | null
          source: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          contact_method: string
          created_at?: string
          customer_id: string
          id?: string
          is_urgent?: boolean
          provider_id: string
          service_id?: string | null
          service_job_id?: string | null
          service_request_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          contact_method?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_urgent?: boolean
          provider_id?: string
          service_id?: string | null
          service_job_id?: string | null
          service_request_id?: string | null
          source?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      contact_reveals: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          provider_id: string
          reveal_reason: string | null
          revealed_phone: string | null
          revealed_whatsapp: string | null
          service_request_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          reveal_reason?: string | null
          revealed_phone?: string | null
          revealed_whatsapp?: string | null
          service_request_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          reveal_reason?: string | null
          revealed_phone?: string | null
          revealed_whatsapp?: string | null
          service_request_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          customer_id: string
          customer_unread_count: number
          id: string
          last_message_at: string
          last_message_preview: string | null
          provider_id: string
          provider_response_id: string | null
          provider_unread_count: number
          service_request_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_unread_count?: number
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          provider_id: string
          provider_response_id?: string | null
          provider_unread_count?: number
          service_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_unread_count?: number
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          provider_id?: string
          provider_response_id?: string | null
          provider_unread_count?: number
          service_request_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_provider_response_id_fkey"
            columns: ["provider_response_id"]
            isOneToOne: false
            referencedRelation: "provider_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_packages: {
        Row: {
          active: boolean
          amount_ugx: number
          created_at: string
          credits: number
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_ugx: number
          created_at?: string
          credits: number
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_ugx?: number
          created_at?: string
          credits?: number
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_purchase_requests: {
        Row: {
          admin_note: string | null
          amount_ugx: number
          created_at: string
          credits_requested: number
          id: string
          package_id: string | null
          package_name: string
          payment_reference: string | null
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_ugx: number
          created_at?: string
          credits_requested: number
          id?: string
          package_id?: string | null
          package_name: string
          payment_reference?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_ugx?: number
          created_at?: string
          credits_requested?: number
          id?: string
          package_id?: string | null
          package_name?: string
          payment_reference?: string | null
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by_admin_id: string | null
          id: string
          reason: string
          related_entity_id: string | null
          related_entity_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          reason?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          reason?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          starter_credits_awarded: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          starter_credits_awarded?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          starter_credits_awarded?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      featured_locations: {
        Row: {
          active: boolean
          area: string | null
          category_slug: string | null
          country: string
          created_at: string
          created_by_admin_id: string | null
          district: string | null
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          priority: number
          region: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          area?: string | null
          category_slug?: string | null
          country?: string
          created_at?: string
          created_by_admin_id?: string | null
          district?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          priority?: number
          region?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          area?: string | null
          category_slug?: string | null
          country?: string
          created_at?: string
          created_by_admin_id?: string | null
          district?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          priority?: number
          region?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          provider_user_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          provider_user_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          provider_user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_push_prefs: {
        Row: {
          category: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          target_id: string | null
          target_type: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          target_id?: string | null
          target_type?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          target_id?: string | null
          target_type?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      official_accounts: {
        Row: {
          bio: string
          cover_image_url: string | null
          created_at: string
          created_by_admin_id: string | null
          id: string
          is_active: boolean
          is_official: boolean
          is_verified: boolean
          name: string
          posting_enabled: boolean
          profile_image_url: string | null
          tagline: string
          updated_at: string
        }
        Insert: {
          bio?: string
          cover_image_url?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          is_verified?: boolean
          name?: string
          posting_enabled?: boolean
          profile_image_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Update: {
          bio?: string
          cover_image_url?: string | null
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          is_active?: boolean
          is_official?: boolean
          is_verified?: boolean
          name?: string
          posting_enabled?: boolean
          profile_image_url?: string | null
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      official_post_comments: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      official_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      official_posts: {
        Row: {
          category_slug: string | null
          contact_info: string | null
          content: string
          created_at: string
          expires_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          is_homepage: boolean
          is_pinned: boolean
          linked_opportunity_id: string | null
          linked_provider_id: string | null
          location: string | null
          official_account_id: string
          post_type: Database["public"]["Enums"]["official_post_type"]
          safety_note: string | null
          source_verified: boolean
          status: string
          subcategory: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_slug?: string | null
          contact_info?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_homepage?: boolean
          is_pinned?: boolean
          linked_opportunity_id?: string | null
          linked_provider_id?: string | null
          location?: string | null
          official_account_id: string
          post_type: Database["public"]["Enums"]["official_post_type"]
          safety_note?: string | null
          source_verified?: boolean
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_slug?: string | null
          contact_info?: string | null
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          is_homepage?: boolean
          is_pinned?: boolean
          linked_opportunity_id?: string | null
          linked_provider_id?: string | null
          location?: string | null
          official_account_id?: string
          post_type?: Database["public"]["Enums"]["official_post_type"]
          safety_note?: string | null
          source_verified?: boolean
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          archived: boolean
          area: string | null
          business_page_id: string | null
          category_slug: string
          compensation: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deadline: string | null
          description: string
          district: string | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          location: string
          opportunity_type: Database["public"]["Enums"]["opportunity_type"]
          poster_id: string
          poster_type: Database["public"]["Enums"]["poster_type"]
          requirements: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          subcategory: string | null
          title: string
          town: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          archived?: boolean
          area?: string | null
          business_page_id?: string | null
          category_slug: string
          compensation?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          district?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          location?: string
          opportunity_type: Database["public"]["Enums"]["opportunity_type"]
          poster_id: string
          poster_type?: Database["public"]["Enums"]["poster_type"]
          requirements?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          subcategory?: string | null
          title: string
          town?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          archived?: boolean
          area?: string | null
          business_page_id?: string | null
          category_slug?: string
          compensation?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          district?: string | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          location?: string
          opportunity_type?: Database["public"]["Enums"]["opportunity_type"]
          poster_id?: string
          poster_type?: Database["public"]["Enums"]["poster_type"]
          requirements?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          subcategory?: string | null
          title?: string
          town?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      opportunity_applications: {
        Row: {
          applicant_id: string
          contact_phone: string | null
          contact_revealed: boolean
          created_at: string
          id: string
          message: string
          opportunity_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          applicant_id: string
          contact_phone?: string | null
          contact_revealed?: boolean
          created_at?: string
          id?: string
          message?: string
          opportunity_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          applicant_id?: string
          contact_phone?: string | null
          contact_revealed?: boolean
          created_at?: string
          id?: string
          message?: string
          opportunity_id?: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          opportunity_id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["opp_report_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          opportunity_id: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["opp_report_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          opportunity_id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["opp_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_reports_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          post_id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          post_id: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          post_id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "timeline_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "timeline_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_admin_notes: {
        Row: {
          author_id: string
          created_at: string
          id: string
          note: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          related_report_id: string | null
          related_request_id: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          note: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          related_report_id?: string | null
          related_request_id?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          note?: string
          profile_id?: string
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          related_report_id?: string | null
          related_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_admin_notes_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "profile_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_admin_notes_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "profile_verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_claim_requests: {
        Row: {
          created_at: string
          email: string | null
          explanation: string
          full_name: string
          id: string
          phone_number: string
          relationship_to_profile: string
          requester_user_id: string
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          service_profile_user_id: string
          status: Database["public"]["Enums"]["claim_status"]
          supporting_file_url: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          explanation?: string
          full_name: string
          id?: string
          phone_number: string
          relationship_to_profile: string
          requester_user_id: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          service_profile_user_id: string
          status?: Database["public"]["Enums"]["claim_status"]
          supporting_file_url?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          explanation?: string
          full_name?: string
          id?: string
          phone_number?: string
          relationship_to_profile?: string
          requester_user_id?: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          service_profile_user_id?: string
          status?: Database["public"]["Enums"]["claim_status"]
          supporting_file_url?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profile_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          reason: string
          reporter_id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["profile_report_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          reason: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["profile_report_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          profile_id?: string
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["profile_report_status"]
        }
        Relationships: []
      }
      profile_services: {
        Row: {
          active: boolean
          category_slug: string | null
          created_at: string
          description: string
          id: string
          is_primary: boolean
          location_served: string | null
          photos: string[]
          price_currency: string
          price_fixed_ugx: number | null
          price_guidance_ugx: number | null
          price_max_ugx: number | null
          price_min_ugx: number | null
          price_note: string | null
          price_type: string | null
          profile_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_slug?: string | null
          created_at?: string
          description?: string
          id?: string
          is_primary?: boolean
          location_served?: string | null
          photos?: string[]
          price_currency?: string
          price_fixed_ugx?: number | null
          price_guidance_ugx?: number | null
          price_max_ugx?: number | null
          price_min_ugx?: number | null
          price_note?: string | null
          price_type?: string | null
          profile_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_slug?: string | null
          created_at?: string
          description?: string
          id?: string
          is_primary?: boolean
          location_served?: string | null
          photos?: string[]
          price_currency?: string
          price_fixed_ugx?: number | null
          price_guidance_ugx?: number | null
          price_max_ugx?: number | null
          price_min_ugx?: number | null
          price_note?: string | null
          price_type?: string | null
          profile_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_services_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_trust_appeals: {
        Row: {
          appeal_kind: Database["public"]["Enums"]["trust_appeal_kind"]
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_note: string | null
          id: string
          message: string
          owner_user_id: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          related_request_id: string | null
          status: Database["public"]["Enums"]["trust_appeal_status"]
          updated_at: string
        }
        Insert: {
          appeal_kind: Database["public"]["Enums"]["trust_appeal_kind"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message: string
          owner_user_id: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          related_request_id?: string | null
          status?: Database["public"]["Enums"]["trust_appeal_status"]
          updated_at?: string
        }
        Update: {
          appeal_kind?: Database["public"]["Enums"]["trust_appeal_kind"]
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_note?: string | null
          id?: string
          message?: string
          owner_user_id?: string
          profile_id?: string
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          related_request_id?: string | null
          status?: Database["public"]["Enums"]["trust_appeal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_trust_appeals_related_request_id_fkey"
            columns: ["related_request_id"]
            isOneToOne: false
            referencedRelation: "profile_verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_trust_status: {
        Row: {
          auto_level: Database["public"]["Enums"]["trust_level"]
          created_at: string
          id: string
          last_recomputed_at: string
          manual_level: Database["public"]["Enums"]["trust_level"] | null
          manual_reason: string | null
          manual_set_at: string | null
          manual_set_by: string | null
          owner_user_id: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          reports_count: number
          updated_at: string
        }
        Insert: {
          auto_level?: Database["public"]["Enums"]["trust_level"]
          created_at?: string
          id?: string
          last_recomputed_at?: string
          manual_level?: Database["public"]["Enums"]["trust_level"] | null
          manual_reason?: string | null
          manual_set_at?: string | null
          manual_set_by?: string | null
          owner_user_id: string
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          reports_count?: number
          updated_at?: string
        }
        Update: {
          auto_level?: Database["public"]["Enums"]["trust_level"]
          created_at?: string
          id?: string
          last_recomputed_at?: string
          manual_level?: Database["public"]["Enums"]["trust_level"] | null
          manual_reason?: string | null
          manual_set_at?: string | null
          manual_set_by?: string | null
          owner_user_id?: string
          profile_id?: string
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          reports_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      profile_verification_requests: {
        Row: {
          admin_note: string | null
          business_name: string | null
          contact_person: string | null
          created_at: string
          experience_summary: string | null
          full_name: string | null
          id: string
          location: string | null
          owner_user_id: string
          phone: string | null
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          requested_type: Database["public"]["Enums"]["verification_request_type"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_request_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          business_name?: string | null
          contact_person?: string | null
          created_at?: string
          experience_summary?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          owner_user_id: string
          phone?: string | null
          profile_id: string
          profile_kind: Database["public"]["Enums"]["profile_kind"]
          requested_type: Database["public"]["Enums"]["verification_request_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          business_name?: string | null
          contact_person?: string | null
          created_at?: string
          experience_summary?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          owner_user_id?: string
          phone?: string | null
          profile_id?: string
          profile_kind?: Database["public"]["Enums"]["profile_kind"]
          requested_type?: Database["public"]["Enums"]["verification_request_type"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_description: string | null
          area: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_provider: boolean
          latitude: number | null
          location_updated_at: string | null
          location_visibility: string
          longitude: number | null
          region: string | null
          town: string | null
          updated_at: string
        }
        Insert: {
          address_description?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id: string
          is_provider?: boolean
          latitude?: number | null
          location_updated_at?: string | null
          location_visibility?: string
          longitude?: number | null
          region?: string | null
          town?: string | null
          updated_at?: string
        }
        Update: {
          address_description?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          is_provider?: boolean
          latitude?: number | null
          location_updated_at?: string | null
          location_visibility?: string
          longitude?: number | null
          region?: string | null
          town?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_privacy_settings: {
        Row: {
          contact_reveal_policy: string
          phone_visibility: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_reveal_policy?: string
          phone_visibility?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_reveal_policy?: string
          phone_visibility?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_recommendations: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          message: string
          provider_user_id: string
          rating: number | null
          service: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          message: string
          provider_user_id: string
          rating?: number | null
          service: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          message?: string
          provider_user_id?: string
          rating?: number | null
          service?: string
          user_id?: string
        }
        Relationships: []
      }
      provider_responses: {
        Row: {
          availability_note: string | null
          contact_preference: string | null
          created_at: string
          estimated_time: string | null
          id: string
          message: string
          portfolio_post_id: string | null
          provider_id: string
          quote_amount: number | null
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          availability_note?: string | null
          contact_preference?: string | null
          created_at?: string
          estimated_time?: string | null
          id?: string
          message?: string
          portfolio_post_id?: string | null
          provider_id: string
          quote_amount?: number | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          availability_note?: string | null
          contact_preference?: string | null
          created_at?: string
          estimated_time?: string | null
          id?: string
          message?: string
          portfolio_post_id?: string | null
          provider_id?: string
          quote_amount?: number | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          address: string | null
          area: string | null
          areas_served: string[]
          availability: string
          avatar_url: string | null
          bio: string
          category_slug: string | null
          claim_status: string
          country: string | null
          cover_url: string | null
          created_at: string
          district: string | null
          email: string | null
          id: string
          is_featured: boolean
          latitude: number | null
          legacy_ref: string | null
          legacy_source: string | null
          longitude: number | null
          name: string
          opening_hours: Json
          owner_id: string
          phone: string | null
          profile_type: Database["public"]["Enums"]["public_profile_type"]
          region: string | null
          seeded_by_official: boolean
          service_radius_km: number | null
          slug: string
          subcategory: string | null
          suspended: boolean
          town: string | null
          updated_at: string
          verified: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          areas_served?: string[]
          availability?: string
          avatar_url?: string | null
          bio?: string
          category_slug?: string | null
          claim_status?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          legacy_ref?: string | null
          legacy_source?: string | null
          longitude?: number | null
          name: string
          opening_hours?: Json
          owner_id: string
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["public_profile_type"]
          region?: string | null
          seeded_by_official?: boolean
          service_radius_km?: number | null
          slug: string
          subcategory?: string | null
          suspended?: boolean
          town?: string | null
          updated_at?: string
          verified?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          areas_served?: string[]
          availability?: string
          avatar_url?: string | null
          bio?: string
          category_slug?: string | null
          claim_status?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          latitude?: number | null
          legacy_ref?: string | null
          legacy_source?: string | null
          longitude?: number | null
          name?: string
          opening_hours?: Json
          owner_id?: string
          phone?: string | null
          profile_type?: Database["public"]["Enums"]["public_profile_type"]
          region?: string | null
          seeded_by_official?: boolean
          service_radius_km?: number | null
          slug?: string
          subcategory?: string | null
          suspended?: boolean
          town?: string | null
          updated_at?: string
          verified?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      push_config: {
        Row: {
          function_url: string
          id: number
          trigger_secret: string
        }
        Insert: {
          function_url: string
          id: number
          trigger_secret?: string
        }
        Update: {
          function_url?: string
          id?: number
          trigger_secret?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          hidden: boolean
          id: string
          provider_user_id: string
          public_profile_id: string | null
          rating: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          provider_user_id: string
          public_profile_id?: string | null
          rating: number
          text?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          provider_user_id?: string
          public_profile_id?: string | null
          rating?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_public_profile_id_fkey"
            columns: ["public_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_opportunities: {
        Row: {
          created_at: string
          id: string
          opportunity_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opportunity_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opportunity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_opportunities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_providers: {
        Row: {
          created_at: string
          provider_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          active: boolean
          blurb: string
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          blurb?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          blurb?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      service_disputes: {
        Row: {
          admin_notes: string | null
          against_user_id: string
          created_at: string
          description: string
          id: string
          raised_by_user_id: string
          reason: string
          resolved_at: string | null
          resolved_by_admin_id: string | null
          service_request_id: string
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          admin_notes?: string | null
          against_user_id: string
          created_at?: string
          description?: string
          id?: string
          raised_by_user_id: string
          reason: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          service_request_id: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          admin_notes?: string | null
          against_user_id?: string
          created_at?: string
          description?: string
          id?: string
          raised_by_user_id?: string
          reason?: string
          resolved_at?: string | null
          resolved_by_admin_id?: string | null
          service_request_id?: string
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_disputes_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_feedback: {
        Row: {
          communication_rating: number | null
          created_at: string
          customer_id: string
          did_use_provider: boolean
          id: string
          is_verified_review: boolean
          is_visible: boolean
          issue_description: string | null
          issue_reported: boolean
          price_fair: string | null
          price_fairness_rating: number | null
          provider_id: string
          quality_rating: number | null
          rating: number
          review_text: string
          service_provided: string
          service_request_id: string
          timekeeping_rating: number | null
          updated_at: string
          was_completed: boolean
          was_on_time: string | null
          work_quality_good: string | null
          would_recommend: boolean
          would_use_again: string | null
        }
        Insert: {
          communication_rating?: number | null
          created_at?: string
          customer_id: string
          did_use_provider?: boolean
          id?: string
          is_verified_review?: boolean
          is_visible?: boolean
          issue_description?: string | null
          issue_reported?: boolean
          price_fair?: string | null
          price_fairness_rating?: number | null
          provider_id: string
          quality_rating?: number | null
          rating: number
          review_text?: string
          service_provided?: string
          service_request_id: string
          timekeeping_rating?: number | null
          updated_at?: string
          was_completed?: boolean
          was_on_time?: string | null
          work_quality_good?: string | null
          would_recommend?: boolean
          would_use_again?: string | null
        }
        Update: {
          communication_rating?: number | null
          created_at?: string
          customer_id?: string
          did_use_provider?: boolean
          id?: string
          is_verified_review?: boolean
          is_visible?: boolean
          issue_description?: string | null
          issue_reported?: boolean
          price_fair?: string | null
          price_fairness_rating?: number | null
          provider_id?: string
          quality_rating?: number | null
          rating?: number
          review_text?: string
          service_provided?: string
          service_request_id?: string
          timekeeping_rating?: number | null
          updated_at?: string
          was_completed?: boolean
          was_on_time?: string | null
          work_quality_good?: string | null
          would_recommend?: boolean
          would_use_again?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_feedback_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: true
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_profiles: {
        Row: {
          area: string | null
          areas_served: string[]
          availability: Database["public"]["Enums"]["availability_status"]
          bio: string
          business_name: string | null
          category_slug: string
          country: string | null
          cover_url: string | null
          created_at: string
          district: string
          email: string | null
          header_url: string | null
          latitude: number | null
          longitude: number | null
          media_urls: string[]
          phone: string | null
          price_currency: string
          price_fixed_ugx: number | null
          price_max_ugx: number | null
          price_min_ugx: number | null
          price_note: string | null
          price_type: string | null
          price_updated_at: string | null
          region: string | null
          seeded_by_official: boolean
          seeded_status:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
          service_radius_km: number | null
          subcategory: string
          suspended: boolean
          town: string
          updated_at: string
          user_id: string
          verified: Database["public"]["Enums"]["verification_status"]
          whatsapp: string | null
          years_experience: number
        }
        Insert: {
          area?: string | null
          areas_served?: string[]
          availability?: Database["public"]["Enums"]["availability_status"]
          bio?: string
          business_name?: string | null
          category_slug: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          district?: string
          email?: string | null
          header_url?: string | null
          latitude?: number | null
          longitude?: number | null
          media_urls?: string[]
          phone?: string | null
          price_currency?: string
          price_fixed_ugx?: number | null
          price_max_ugx?: number | null
          price_min_ugx?: number | null
          price_note?: string | null
          price_type?: string | null
          price_updated_at?: string | null
          region?: string | null
          seeded_by_official?: boolean
          seeded_status?:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
          service_radius_km?: number | null
          subcategory: string
          suspended?: boolean
          town?: string
          updated_at?: string
          user_id: string
          verified?: Database["public"]["Enums"]["verification_status"]
          whatsapp?: string | null
          years_experience?: number
        }
        Update: {
          area?: string | null
          areas_served?: string[]
          availability?: Database["public"]["Enums"]["availability_status"]
          bio?: string
          business_name?: string | null
          category_slug?: string
          country?: string | null
          cover_url?: string | null
          created_at?: string
          district?: string
          email?: string | null
          header_url?: string | null
          latitude?: number | null
          longitude?: number | null
          media_urls?: string[]
          phone?: string | null
          price_currency?: string
          price_fixed_ugx?: number | null
          price_max_ugx?: number | null
          price_min_ugx?: number | null
          price_note?: string | null
          price_type?: string | null
          price_updated_at?: string | null
          region?: string | null
          seeded_by_official?: boolean
          seeded_status?:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
          service_radius_km?: number | null
          subcategory?: string
          suspended?: boolean
          town?: string
          updated_at?: string
          user_id?: string
          verified?: Database["public"]["Enums"]["verification_status"]
          whatsapp?: string | null
          years_experience?: number
        }
        Relationships: []
      }
      service_request_status_history: {
        Row: {
          changed_by_user_id: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["service_request_status"]
          note: string | null
          old_status:
            | Database["public"]["Enums"]["service_request_status"]
            | null
          service_request_id: string
        }
        Insert: {
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["service_request_status"]
          note?: string | null
          old_status?:
            | Database["public"]["Enums"]["service_request_status"]
            | null
          service_request_id: string
        }
        Update: {
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["service_request_status"]
          note?: string | null
          old_status?:
            | Database["public"]["Enums"]["service_request_status"]
            | null
          service_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_status_history_service_request_id_fkey"
            columns: ["service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          area: string | null
          attachment_url: string | null
          budget_range: string | null
          cancelled_at: string | null
          category_slug: string | null
          completed_at: string | null
          completion_code: string | null
          country: string | null
          created_at: string
          customer_confirmed_completion: boolean
          customer_id: string
          customer_phone: string | null
          customer_whatsapp: string | null
          description: string
          disputed_at: string | null
          district: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          media_urls: string[]
          posted_as_avatar_url: string | null
          posted_as_name: string | null
          posted_as_ref_id: string | null
          posted_as_ref_type: string | null
          posted_as_type: string
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          preferred_date: string | null
          preferred_time: string | null
          profile_service_id: string | null
          provider_confirmed_completion: boolean
          provider_id: string | null
          public_profile_id: string | null
          region: string | null
          selected_provider_id: string | null
          service_needed: string
          service_profile_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          subcategory: string | null
          title: string | null
          town: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["service_urgency"]
          urgent_flag: boolean
          visibility: string
        }
        Insert: {
          area?: string | null
          attachment_url?: string | null
          budget_range?: string | null
          cancelled_at?: string | null
          category_slug?: string | null
          completed_at?: string | null
          completion_code?: string | null
          country?: string | null
          created_at?: string
          customer_confirmed_completion?: boolean
          customer_id: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          description?: string
          disputed_at?: string | null
          district?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          media_urls?: string[]
          posted_as_avatar_url?: string | null
          posted_as_name?: string | null
          posted_as_ref_id?: string | null
          posted_as_ref_type?: string | null
          posted_as_type?: string
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          preferred_date?: string | null
          preferred_time?: string | null
          profile_service_id?: string | null
          provider_confirmed_completion?: boolean
          provider_id?: string | null
          public_profile_id?: string | null
          region?: string | null
          selected_provider_id?: string | null
          service_needed: string
          service_profile_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          subcategory?: string | null
          title?: string | null
          town?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["service_urgency"]
          urgent_flag?: boolean
          visibility?: string
        }
        Update: {
          area?: string | null
          attachment_url?: string | null
          budget_range?: string | null
          cancelled_at?: string | null
          category_slug?: string | null
          completed_at?: string | null
          completion_code?: string | null
          country?: string | null
          created_at?: string
          customer_confirmed_completion?: boolean
          customer_id?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          description?: string
          disputed_at?: string | null
          district?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          media_urls?: string[]
          posted_as_avatar_url?: string | null
          posted_as_name?: string | null
          posted_as_ref_id?: string | null
          posted_as_ref_type?: string | null
          posted_as_type?: string
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          preferred_date?: string | null
          preferred_time?: string | null
          profile_service_id?: string | null
          provider_confirmed_completion?: boolean
          provider_id?: string | null
          public_profile_id?: string | null
          region?: string | null
          selected_provider_id?: string | null
          service_needed?: string
          service_profile_id?: string | null
          status?: Database["public"]["Enums"]["service_request_status"]
          subcategory?: string | null
          title?: string | null
          town?: string | null
          updated_at?: string
          urgency?: Database["public"]["Enums"]["service_urgency"]
          urgent_flag?: boolean
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_profile_service_id_fkey"
            columns: ["profile_service_id"]
            isOneToOne: false
            referencedRelation: "profile_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_public_profile_id_fkey"
            columns: ["public_profile_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subcategories: {
        Row: {
          active: boolean
          category_slug: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_slug: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_slug?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_subcategories_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      timeline_posts: {
        Row: {
          area: string | null
          business_page_id: string | null
          category_slug: string | null
          created_at: string
          district: string | null
          featured: boolean
          hidden: boolean
          hidden_reason: string | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          media_urls: string[]
          post_type: Database["public"]["Enums"]["post_type"]
          provider_user_id: string
          text: string
          town: string | null
        }
        Insert: {
          area?: string | null
          business_page_id?: string | null
          category_slug?: string | null
          created_at?: string
          district?: string | null
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_urls?: string[]
          post_type?: Database["public"]["Enums"]["post_type"]
          provider_user_id: string
          text: string
          town?: string | null
        }
        Update: {
          area?: string | null
          business_page_id?: string | null
          category_slug?: string | null
          created_at?: string
          district?: string | null
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          media_urls?: string[]
          post_type?: Database["public"]["Enums"]["post_type"]
          provider_user_id?: string
          text?: string
          town?: string | null
        }
        Relationships: []
      }
      trust_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          new_level: Database["public"]["Enums"]["trust_level"] | null
          owner_user_id: string | null
          prev_level: Database["public"]["Enums"]["trust_level"] | null
          profile_id: string | null
          profile_kind: Database["public"]["Enums"]["profile_kind"] | null
          reason: string | null
          related_appeal_id: string | null
          related_report_id: string | null
          related_request_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          new_level?: Database["public"]["Enums"]["trust_level"] | null
          owner_user_id?: string | null
          prev_level?: Database["public"]["Enums"]["trust_level"] | null
          profile_id?: string | null
          profile_kind?: Database["public"]["Enums"]["profile_kind"] | null
          reason?: string | null
          related_appeal_id?: string | null
          related_report_id?: string | null
          related_request_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          new_level?: Database["public"]["Enums"]["trust_level"] | null
          owner_user_id?: string | null
          prev_level?: Database["public"]["Enums"]["trust_level"] | null
          profile_id?: string | null
          profile_kind?: Database["public"]["Enums"]["profile_kind"] | null
          reason?: string | null
          related_appeal_id?: string | null
          related_report_id?: string | null
          related_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_audit_log_related_appeal_id_fkey"
            columns: ["related_appeal_id"]
            isOneToOne: false
            referencedRelation: "profile_trust_appeals"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_settings: {
        Row: {
          allow_boost_unverified: boolean
          documents_required: boolean
          id: number
          manual_verification_open: boolean
          min_completed_jobs_for_reviewed: number
          min_verified_reviews_for_reviewed: number
          report_auto_flag_threshold: number
          report_auto_flag_window_days: number
          show_badges_publicly: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allow_boost_unverified?: boolean
          documents_required?: boolean
          id?: number
          manual_verification_open?: boolean
          min_completed_jobs_for_reviewed?: number
          min_verified_reviews_for_reviewed?: number
          report_auto_flag_threshold?: number
          report_auto_flag_window_days?: number
          show_badges_publicly?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allow_boost_unverified?: boolean
          documents_required?: boolean
          id?: number
          manual_verification_open?: boolean
          min_completed_jobs_for_reviewed?: number
          min_verified_reviews_for_reviewed?: number
          report_auto_flag_threshold?: number
          report_auto_flag_window_days?: number
          show_badges_publicly?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          reason?: string | null
        }
        Relationships: []
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
      verification_evidence: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          note: string | null
          owner_user_id: string
          request_id: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          note?: string | null
          owner_user_id: string
          request_id: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          note?: string | null
          owner_user_id?: string
          request_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_evidence_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "profile_verification_requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_boosts_public: {
        Row: {
          boost_type: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string | null
          starts_at: string | null
          status: string | null
        }
        Insert: {
          boost_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string | null
          starts_at?: string | null
          status?: string | null
        }
        Update: {
          boost_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string | null
          starts_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      provider_trust_stats: {
        Row: {
          average_rating: number | null
          cancelled_service_requests: number | null
          completed_service_requests: number | null
          completion_rate: number | null
          disputed_service_requests: number | null
          provider_id: string | null
          response_rate: number | null
          total_followers: number | null
          total_recommendations: number | null
          total_service_requests: number | null
          total_verified_reviews: number | null
          trust_score: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _haversine_km: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      _is_owner_or_staff: { Args: { _uid: string }; Returns: boolean }
      _slugify: { Args: { _text: string }; Returns: string }
      _trust_profile_owner: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
        }
        Returns: string
      }
      admin_add_credits: {
        Args: { _amount: number; _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_add_profile_note: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
          _note: string
          _related_report_id?: string
          _related_request_id?: string
        }
        Returns: string
      }
      admin_clear_manual_trust_level: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
          _reason?: string
        }
        Returns: undefined
      }
      admin_decide_trust_appeal: {
        Args: { _appeal_id: string; _decision: string; _note?: string }
        Returns: undefined
      }
      admin_decide_verification_request: {
        Args: { _admin_note?: string; _decision: string; _request_id: string }
        Returns: undefined
      }
      admin_deduct_credits: {
        Args: { _amount: number; _reason?: string; _user_id: string }
        Returns: undefined
      }
      admin_expire_boost: { Args: { _boost_id: string }; Returns: undefined }
      admin_grant_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_list_user_contacts: {
        Args: { _ids: string[] }
        Returns: {
          email: string
          id: string
          phone: string
        }[]
      }
      admin_list_user_roles: {
        Args: { _ids: string[] }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      admin_resolve_profile_report: {
        Args: { _note?: string; _report_id: string; _resolution: string }
        Returns: undefined
      }
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      admin_search_activity_log:
        | {
            Args: { _limit?: number; _offset?: number; _q?: string }
            Returns: {
              action: string
              actor_email: string
              actor_name: string
              actor_user_id: string
              created_at: string
              details: Json
              id: string
              target_email: string
              target_id: string
              target_name: string
              target_type: string
              target_user_id: string
            }[]
          }
        | {
            Args: {
              _from?: string
              _limit?: number
              _offset?: number
              _q?: string
              _to?: string
            }
            Returns: {
              action: string
              actor_email: string
              actor_name: string
              actor_user_id: string
              created_at: string
              details: Json
              id: string
              target_email: string
              target_id: string
              target_name: string
              target_type: string
              target_user_id: string
            }[]
          }
      admin_set_trust_level: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
          _level: Database["public"]["Enums"]["trust_level"]
          _reason?: string
        }
        Returns: undefined
      }
      approve_purchase_request: {
        Args: {
          _admin_note?: string
          _payment_reference?: string
          _request_id: string
        }
        Returns: undefined
      }
      can_reveal_contact: {
        Args: { _customer: string; _provider: string }
        Returns: boolean
      }
      confirm_completion: {
        Args: { _code: string; _request_id: string }
        Returns: undefined
      }
      confirm_completion_customer: {
        Args: { _request_id: string }
        Returns: undefined
      }
      create_boost: {
        Args: { _entity_id: string; _entity_type: string; _pricing_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          _actor_id: string
          _message: string
          _target_id: string
          _target_type: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      get_application_phone: { Args: { _app_id: string }; Returns: string }
      get_completion_code: { Args: { _request_id: string }; Returns: string }
      get_my_profile: {
        Args: never
        Returns: {
          address_description: string | null
          area: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_provider: boolean
          latitude: number | null
          location_updated_at: string | null
          location_visibility: string
          longitude: number | null
          region: string | null
          town: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_my_service_profile: {
        Args: never
        Returns: {
          area: string | null
          areas_served: string[]
          availability: Database["public"]["Enums"]["availability_status"]
          bio: string
          business_name: string | null
          category_slug: string
          country: string | null
          cover_url: string | null
          created_at: string
          district: string
          email: string | null
          header_url: string | null
          latitude: number | null
          longitude: number | null
          media_urls: string[]
          phone: string | null
          price_currency: string
          price_fixed_ugx: number | null
          price_max_ugx: number | null
          price_min_ugx: number | null
          price_note: string | null
          price_type: string | null
          price_updated_at: string | null
          region: string | null
          seeded_by_official: boolean
          seeded_status:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
          service_radius_km: number | null
          subcategory: string
          suspended: boolean
          town: string
          updated_at: string
          user_id: string
          verified: Database["public"]["Enums"]["verification_status"]
          whatsapp: string | null
          years_experience: number
        }[]
        SetofOptions: {
          from: "*"
          to: "service_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_profile_card: {
        Args: { _id: string }
        Returns: {
          area: string
          avatar_url: string
          bio: string
          district: string
          full_name: string
          id: string
          is_provider: boolean
          location_visibility: string
          town: string
        }[]
      }
      get_profile_cards: {
        Args: { _ids: string[] }
        Returns: {
          area: string
          avatar_url: string
          bio: string
          district: string
          full_name: string
          id: string
          is_provider: boolean
          location_visibility: string
          town: string
        }[]
      }
      get_profile_claim_contact: {
        Args: { _id: string }
        Returns: {
          email: string
          phone_number: string
          supporting_file_url: string
          whatsapp_number: string
        }[]
      }
      get_profile_trust_badge: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
        }
        Returns: Database["public"]["Enums"]["trust_level"]
      }
      get_profile_trust_checklist: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
        }
        Returns: {
          done: boolean
          key: string
          label: string
          unlocks: string
        }[]
      }
      get_provider_contact: {
        Args: { _provider: string }
        Returns: {
          email: string
          phone: string
          whatsapp: string
        }[]
      }
      get_unread_message_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_admin_activity: {
        Args: {
          _action: string
          _details: Json
          _target_id: string
          _target_type: string
          _target_user_id: string
        }
        Returns: undefined
      }
      mark_conversation_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      matching_requests_for_provider: {
        Args: { _provider: string }
        Returns: {
          area: string | null
          attachment_url: string | null
          budget_range: string | null
          cancelled_at: string | null
          category_slug: string | null
          completed_at: string | null
          completion_code: string | null
          country: string | null
          created_at: string
          customer_confirmed_completion: boolean
          customer_id: string
          customer_phone: string | null
          customer_whatsapp: string | null
          description: string
          disputed_at: string | null
          district: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          media_urls: string[]
          posted_as_avatar_url: string | null
          posted_as_name: string | null
          posted_as_ref_id: string | null
          posted_as_ref_type: string | null
          posted_as_type: string
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          preferred_date: string | null
          preferred_time: string | null
          profile_service_id: string | null
          provider_confirmed_completion: boolean
          provider_id: string | null
          public_profile_id: string | null
          region: string | null
          selected_provider_id: string | null
          service_needed: string
          service_profile_id: string | null
          status: Database["public"]["Enums"]["service_request_status"]
          subcategory: string | null
          title: string | null
          town: string | null
          updated_at: string
          urgency: Database["public"]["Enums"]["service_urgency"]
          urgent_flag: boolean
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "service_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      nearby_service_profiles: {
        Args: {
          in_lat: number
          in_limit?: number
          in_lng: number
          in_radius_km?: number
        }
        Returns: {
          area: string
          areas_served: string[]
          business_name: string
          category_slug: string
          distance_km: number
          district: string
          latitude: number
          longitude: number
          service_radius_km: number
          subcategory: string
          town: string
          user_id: string
          verified: string
        }[]
      }
      nearby_service_requests: {
        Args: {
          in_lat: number
          in_limit?: number
          in_lng: number
          in_radius_km?: number
        }
        Returns: {
          area: string
          budget_range: string
          created_at: string
          description: string
          distance_km: number
          district: string
          id: string
          latitude: number
          location: string
          longitude: number
          service_needed: string
          title: string
          town: string
          urgent_flag: boolean
        }[]
      }
      recompute_profile_trust: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
        }
        Returns: Database["public"]["Enums"]["trust_level"]
      }
      reject_purchase_request: {
        Args: { _admin_note?: string; _request_id: string }
        Returns: undefined
      }
      reveal_application_contact: { Args: { _app_id: string }; Returns: string }
      send_test_push_notification: { Args: never; Returns: string }
      spend_credits: {
        Args: {
          _amount: number
          _entity_id?: string
          _entity_type?: string
          _reason: string
          _tx_type: string
          _user_id: string
        }
        Returns: string
      }
      start_direct_conversation: {
        Args: { _provider_id: string }
        Returns: string
      }
      start_or_get_conversation: {
        Args: {
          _provider_id: string
          _provider_response_id?: string
          _service_request_id: string
        }
        Returns: string
      }
      submit_trust_appeal: {
        Args: {
          _appeal_kind: Database["public"]["Enums"]["trust_appeal_kind"]
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
          _message: string
          _related_request_id?: string
        }
        Returns: string
      }
      sync_is_provider_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      trust_rank: {
        Args: {
          _id: string
          _kind: Database["public"]["Enums"]["profile_kind"]
        }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "finance_admin"
      application_status: "sent" | "viewed" | "accepted" | "rejected"
      availability_status: "available" | "busy" | "away"
      claim_status: "pending" | "approved" | "rejected"
      contact_method: "phone" | "whatsapp" | "in_app" | "any"
      dispute_status: "open" | "reviewing" | "resolved" | "dismissed"
      official_post_type:
        | "opportunity"
        | "featured_provider"
        | "verified_provider"
        | "service_highlight"
        | "safety_tip"
        | "platform_update"
        | "user_education"
        | "new_feature"
        | "announcement"
      opp_report_status: "open" | "reviewed" | "resolved" | "dismissed"
      opportunity_status:
        | "pending"
        | "approved"
        | "rejected"
        | "featured"
        | "expired"
      opportunity_type:
        | "gig"
        | "job"
        | "internship"
        | "volunteer"
        | "apprenticeship"
      post_type:
        | "work_update"
        | "completed_job"
        | "available"
        | "before_after"
        | "new_service"
        | "promotion"
        | "opportunity_shared"
      poster_type:
        | "individual"
        | "business"
        | "organization"
        | "school"
        | "church"
        | "ngo"
        | "admin"
      profile_kind: "service_profile" | "business_page"
      profile_report_status: "open" | "reviewed" | "dismissed" | "action_taken"
      public_profile_type: "individual" | "business" | "organization"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      seeded_profile_status: "unclaimed" | "claim_pending" | "claimed"
      service_request_status:
        | "requested"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "disputed"
      service_urgency: "normal" | "urgent" | "emergency"
      trust_appeal_kind: "suspension" | "under_review" | "rejected_verification"
      trust_appeal_status: "open" | "approved" | "denied" | "withdrawn"
      trust_level:
        | "new"
        | "phone_verified"
        | "profile_complete"
        | "reviewed_provider"
        | "verified_provider"
        | "verified_business"
        | "verified_organization"
        | "under_review"
        | "suspended"
      verification_request_status:
        | "pending"
        | "more_info"
        | "approved"
        | "rejected"
        | "revoked"
      verification_request_type:
        | "verified_provider"
        | "verified_business"
        | "verified_organization"
      verification_status: "none" | "pending" | "verified" | "featured"
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
      app_role: ["admin", "moderator", "user", "finance_admin"],
      application_status: ["sent", "viewed", "accepted", "rejected"],
      availability_status: ["available", "busy", "away"],
      claim_status: ["pending", "approved", "rejected"],
      contact_method: ["phone", "whatsapp", "in_app", "any"],
      dispute_status: ["open", "reviewing", "resolved", "dismissed"],
      official_post_type: [
        "opportunity",
        "featured_provider",
        "verified_provider",
        "service_highlight",
        "safety_tip",
        "platform_update",
        "user_education",
        "new_feature",
        "announcement",
      ],
      opp_report_status: ["open", "reviewed", "resolved", "dismissed"],
      opportunity_status: [
        "pending",
        "approved",
        "rejected",
        "featured",
        "expired",
      ],
      opportunity_type: [
        "gig",
        "job",
        "internship",
        "volunteer",
        "apprenticeship",
      ],
      post_type: [
        "work_update",
        "completed_job",
        "available",
        "before_after",
        "new_service",
        "promotion",
        "opportunity_shared",
      ],
      poster_type: [
        "individual",
        "business",
        "organization",
        "school",
        "church",
        "ngo",
        "admin",
      ],
      profile_kind: ["service_profile", "business_page"],
      profile_report_status: ["open", "reviewed", "dismissed", "action_taken"],
      public_profile_type: ["individual", "business", "organization"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      seeded_profile_status: ["unclaimed", "claim_pending", "claimed"],
      service_request_status: [
        "requested",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
      ],
      service_urgency: ["normal", "urgent", "emergency"],
      trust_appeal_kind: [
        "suspension",
        "under_review",
        "rejected_verification",
      ],
      trust_appeal_status: ["open", "approved", "denied", "withdrawn"],
      trust_level: [
        "new",
        "phone_verified",
        "profile_complete",
        "reviewed_provider",
        "verified_provider",
        "verified_business",
        "verified_organization",
        "under_review",
        "suspended",
      ],
      verification_request_status: [
        "pending",
        "more_info",
        "approved",
        "rejected",
        "revoked",
      ],
      verification_request_type: [
        "verified_provider",
        "verified_business",
        "verified_organization",
      ],
      verification_status: ["none", "pending", "verified", "featured"],
    },
  },
} as const
