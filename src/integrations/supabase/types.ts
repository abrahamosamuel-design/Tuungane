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
          cover_url: string | null
          created_at: string
          description: string
          district: string | null
          email: string | null
          id: string
          is_featured: boolean
          logo_url: string | null
          name: string
          opening_hours: Json
          org_type: string
          owner_id: string
          products: string[]
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
          cover_url?: string | null
          created_at?: string
          description?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name: string
          opening_hours?: Json
          org_type?: string
          owner_id: string
          products?: string[]
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
          cover_url?: string | null
          created_at?: string
          description?: string
          district?: string | null
          email?: string | null
          id?: string
          is_featured?: boolean
          logo_url?: string | null
          name?: string
          opening_hours?: Json
          org_type?: string
          owner_id?: string
          products?: string[]
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
          provider_id: string
          service_job_id: string | null
          service_request_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          contact_method: string
          created_at?: string
          customer_id: string
          id?: string
          provider_id: string
          service_job_id?: string | null
          service_request_id: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          contact_method?: string
          created_at?: string
          customer_id?: string
          id?: string
          provider_id?: string
          service_job_id?: string | null
          service_request_id?: string
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
          created_at: string
          id: string
          message: string
          opportunity_id: string
          status: Database["public"]["Enums"]["application_status"]
        }
        Insert: {
          applicant_id: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string
          opportunity_id: string
          status?: Database["public"]["Enums"]["application_status"]
        }
        Update: {
          applicant_id?: string
          contact_phone?: string | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          district: string | null
          full_name: string
          id: string
          is_provider: boolean
          town: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id: string
          is_provider?: boolean
          town?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          district?: string | null
          full_name?: string
          id?: string
          is_provider?: boolean
          town?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_privacy_settings: {
        Row: {
          contact_reveal_policy: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_reveal_policy?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_reveal_policy?: string
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
          rating: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden?: boolean
          id?: string
          provider_user_id: string
          rating: number
          text?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden?: boolean
          id?: string
          provider_user_id?: string
          rating?: number
          text?: string
          user_id?: string
        }
        Relationships: []
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
          cover_url: string | null
          created_at: string
          district: string
          email: string | null
          phone: string | null
          seeded_by_official: boolean
          seeded_status:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
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
          cover_url?: string | null
          created_at?: string
          district?: string
          email?: string | null
          phone?: string | null
          seeded_by_official?: boolean
          seeded_status?:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
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
          cover_url?: string | null
          created_at?: string
          district?: string
          email?: string | null
          phone?: string | null
          seeded_by_official?: boolean
          seeded_status?:
            | Database["public"]["Enums"]["seeded_profile_status"]
            | null
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
          created_at: string
          customer_confirmed_completion: boolean
          customer_id: string
          customer_phone: string | null
          customer_whatsapp: string | null
          description: string
          disputed_at: string | null
          district: string | null
          id: string
          location: string
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          preferred_date: string | null
          preferred_time: string | null
          provider_confirmed_completion: boolean
          provider_id: string | null
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
          created_at?: string
          customer_confirmed_completion?: boolean
          customer_id: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          description?: string
          disputed_at?: string | null
          district?: string | null
          id?: string
          location?: string
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          preferred_date?: string | null
          preferred_time?: string | null
          provider_confirmed_completion?: boolean
          provider_id?: string | null
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
          created_at?: string
          customer_confirmed_completion?: boolean
          customer_id?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          description?: string
          disputed_at?: string | null
          district?: string | null
          id?: string
          location?: string
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          preferred_date?: string | null
          preferred_time?: string | null
          provider_confirmed_completion?: boolean
          provider_id?: string | null
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
        Relationships: []
      }
      timeline_posts: {
        Row: {
          business_page_id: string | null
          category_slug: string | null
          created_at: string
          featured: boolean
          hidden: boolean
          hidden_reason: string | null
          id: string
          location: string | null
          media_urls: string[]
          post_type: Database["public"]["Enums"]["post_type"]
          provider_user_id: string
          text: string
        }
        Insert: {
          business_page_id?: string | null
          category_slug?: string | null
          created_at?: string
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          location?: string | null
          media_urls?: string[]
          post_type?: Database["public"]["Enums"]["post_type"]
          provider_user_id: string
          text: string
        }
        Update: {
          business_page_id?: string | null
          category_slug?: string | null
          created_at?: string
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          location?: string | null
          media_urls?: string[]
          post_type?: Database["public"]["Enums"]["post_type"]
          provider_user_id?: string
          text?: string
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
      admin_add_credits: {
        Args: { _amount: number; _reason?: string; _user_id: string }
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
      admin_revoke_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
          created_at: string
          customer_confirmed_completion: boolean
          customer_id: string
          customer_phone: string | null
          customer_whatsapp: string | null
          description: string
          disputed_at: string | null
          district: string | null
          id: string
          location: string
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          preferred_date: string | null
          preferred_time: string | null
          provider_confirmed_completion: boolean
          provider_id: string | null
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
      reject_purchase_request: {
        Args: { _admin_note?: string; _request_id: string }
        Returns: undefined
      }
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
      verification_status: ["none", "pending", "verified", "featured"],
    },
  },
} as const
