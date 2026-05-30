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
      opportunities: {
        Row: {
          area: string | null
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
          area?: string | null
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
          area?: string | null
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
      service_profiles: {
        Row: {
          area: string | null
          areas_served: string[]
          availability: Database["public"]["Enums"]["availability_status"]
          bio: string
          business_name: string | null
          category_slug: string
          created_at: string
          district: string
          email: string | null
          phone: string | null
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
          created_at?: string
          district?: string
          email?: string | null
          phone?: string | null
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
          created_at?: string
          district?: string
          email?: string | null
          phone?: string | null
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
      timeline_posts: {
        Row: {
          category_slug: string | null
          created_at: string
          featured: boolean
          hidden: boolean
          hidden_reason: string | null
          id: string
          location: string | null
          media_urls: string[]
          provider_user_id: string
          text: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          location?: string | null
          media_urls?: string[]
          provider_user_id: string
          text: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          featured?: boolean
          hidden?: boolean
          hidden_reason?: string | null
          id?: string
          location?: string | null
          media_urls?: string[]
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
      app_role: "admin" | "moderator" | "user"
      application_status: "sent" | "viewed" | "accepted" | "rejected"
      availability_status: "available" | "busy" | "away"
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
      poster_type:
        | "individual"
        | "business"
        | "organization"
        | "school"
        | "church"
        | "ngo"
        | "admin"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
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
      app_role: ["admin", "moderator", "user"],
      application_status: ["sent", "viewed", "accepted", "rejected"],
      availability_status: ["available", "busy", "away"],
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
      verification_status: ["none", "pending", "verified", "featured"],
    },
  },
} as const
