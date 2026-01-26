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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      business_likes: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_likes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_likes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          average_response_time: string | null
          budget_range: string | null
          business_goals: string[] | null
          business_location: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          company_name: string
          company_size: string | null
          competitive_landscape: string | null
          cover_image_url: string | null
          created_at: string
          delivery_available: boolean | null
          expectations_from_string: string | null
          growth_strategy: string | null
          id: string
          industry: string | null
          internal_capacity: string | null
          latitude: number | null
          longitude: number | null
          marketing_channels: string[] | null
          monthly_customer_volume: string | null
          operating_region: string | null
          pain_points: string[] | null
          pickup_available: boolean | null
          products_services: string | null
          reputation_score: number | null
          service_radius_km: number | null
          social_links: Json | null
          strategic_notes: string | null
          target_customer_type: string | null
          total_completed_orders: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
          verified: boolean | null
          website: string | null
          years_in_operation: string | null
        }
        Insert: {
          average_response_time?: string | null
          budget_range?: string | null
          business_goals?: string[] | null
          business_location?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          company_name: string
          company_size?: string | null
          competitive_landscape?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_available?: boolean | null
          expectations_from_string?: string | null
          growth_strategy?: string | null
          id?: string
          industry?: string | null
          internal_capacity?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_channels?: string[] | null
          monthly_customer_volume?: string | null
          operating_region?: string | null
          pain_points?: string[] | null
          pickup_available?: boolean | null
          products_services?: string | null
          reputation_score?: number | null
          service_radius_km?: number | null
          social_links?: Json | null
          strategic_notes?: string | null
          target_customer_type?: string | null
          total_completed_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          website?: string | null
          years_in_operation?: string | null
        }
        Update: {
          average_response_time?: string | null
          budget_range?: string | null
          business_goals?: string[] | null
          business_location?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          company_name?: string
          company_size?: string | null
          competitive_landscape?: string | null
          cover_image_url?: string | null
          created_at?: string
          delivery_available?: boolean | null
          expectations_from_string?: string | null
          growth_strategy?: string | null
          id?: string
          industry?: string | null
          internal_capacity?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_channels?: string[] | null
          monthly_customer_volume?: string | null
          operating_region?: string | null
          pain_points?: string[] | null
          pickup_available?: boolean | null
          products_services?: string | null
          reputation_score?: number | null
          service_radius_km?: number | null
          social_links?: Json | null
          strategic_notes?: string | null
          target_customer_type?: string | null
          total_completed_orders?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          website?: string | null
          years_in_operation?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
          sender_type: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
          sender_type: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          id: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          age_range: string | null
          created_at: string
          custom_preferences: string | null
          gender: string | null
          id: string
          improvement_wishes: string | null
          interests: string[] | null
          latitude: number | null
          lifestyle_preferences: string[] | null
          location: string | null
          longitude: number | null
          pain_points: string[] | null
          preferred_categories: string[] | null
          purchase_frequency: string | null
          service_expectations: string | null
          spending_habits: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          created_at?: string
          custom_preferences?: string | null
          gender?: string | null
          id?: string
          improvement_wishes?: string | null
          interests?: string[] | null
          latitude?: number | null
          lifestyle_preferences?: string[] | null
          location?: string | null
          longitude?: number | null
          pain_points?: string[] | null
          preferred_categories?: string[] | null
          purchase_frequency?: string | null
          service_expectations?: string | null
          spending_habits?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          created_at?: string
          custom_preferences?: string | null
          gender?: string | null
          id?: string
          improvement_wishes?: string | null
          interests?: string[] | null
          latitude?: number | null
          lifestyle_preferences?: string[] | null
          location?: string | null
          longitude?: number | null
          pain_points?: string[] | null
          preferred_categories?: string[] | null
          purchase_frequency?: string | null
          service_expectations?: string | null
          spending_habits?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          accepted_at: string | null
          attachments: string[] | null
          budget_max: number | null
          budget_min: number | null
          business_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          customer_id: string
          description: string | null
          final_price: number | null
          id: string
          job_number: string
          location: string | null
          notes: string | null
          quoted_at: string | null
          quoted_price: number | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_id: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          attachments?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          business_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          final_price?: number | null
          id?: string
          job_number?: string
          location?: string | null
          notes?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          attachments?: string[] | null
          budget_max?: number | null
          budget_min?: number | null
          business_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          final_price?: number | null
          id?: string
          job_number?: string
          location?: string | null
          notes?: string | null
          quoted_at?: string | null
          quoted_price?: number | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_id?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          business_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_fee: number | null
          delivery_method: string | null
          estimated_delivery: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          shipped_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          estimated_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          shipped_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          estimated_delivery?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          shipped_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          dimensions: Json | null
          id: string
          image_url: string | null
          in_stock: boolean
          is_featured: boolean | null
          min_order_quantity: number | null
          name: string
          nicknames: string[] | null
          price: number | null
          sku: string | null
          total_orders: number | null
          total_views: number | null
          unit: string | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_featured?: boolean | null
          min_order_quantity?: number | null
          name: string
          nicknames?: string[] | null
          price?: number | null
          sku?: string | null
          total_orders?: number | null
          total_views?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          id?: string
          image_url?: string | null
          in_stock?: boolean
          is_featured?: boolean | null
          min_order_quantity?: number | null
          name?: string
          nicknames?: string[] | null
          price?: number | null
          sku?: string | null
          total_orders?: number | null
          total_views?: number | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          latitude: number | null
          longitude: number | null
          onboarding_completed: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      requests: {
        Row: {
          business_id: string | null
          created_at: string
          customer_id: string
          id: string
          message: string | null
          response: string | null
          status: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          message?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          message?: string | null
          response?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          business_id: string | null
          content: string | null
          created_at: string
          helpful_count: number | null
          id: string
          images: string[] | null
          job_id: string | null
          order_id: string | null
          product_id: string | null
          rating: number
          response: string | null
          response_at: string | null
          reviewer_id: string
          reviewer_type: string
          service_id: string | null
          title: string | null
          updated_at: string
          verified_purchase: boolean | null
        }
        Insert: {
          business_id?: string | null
          content?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          job_id?: string | null
          order_id?: string | null
          product_id?: string | null
          rating: number
          response?: string | null
          response_at?: string | null
          reviewer_id: string
          reviewer_type: string
          service_id?: string | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean | null
        }
        Update: {
          business_id?: string | null
          content?: string | null
          created_at?: string
          helpful_count?: number | null
          id?: string
          images?: string[] | null
          job_id?: string | null
          order_id?: string | null
          product_id?: string | null
          rating?: number
          response?: string | null
          response_at?: string | null
          reviewer_id?: string
          reviewer_type?: string
          service_id?: string | null
          title?: string | null
          updated_at?: string
          verified_purchase?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_businesses: {
        Row: {
          business_id: string
          created_at: string
          customer_id: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_id: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_businesses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          availability: string | null
          business_id: string
          category: string | null
          created_at: string
          description: string | null
          duration_estimate: string | null
          id: string
          is_featured: boolean | null
          location_coverage: string[] | null
          name: string
          portfolio_images: string[] | null
          price_max: number | null
          price_min: number | null
          price_type: string
          total_jobs: number | null
          total_views: number | null
          updated_at: string
        }
        Insert: {
          availability?: string | null
          business_id: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_estimate?: string | null
          id?: string
          is_featured?: boolean | null
          location_coverage?: string[] | null
          name: string
          portfolio_images?: string[] | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          total_jobs?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Update: {
          availability?: string | null
          business_id?: string
          category?: string | null
          created_at?: string
          description?: string | null
          duration_estimate?: string | null
          id?: string
          is_featured?: boolean | null
          location_coverage?: string[] | null
          name?: string
          portfolio_images?: string[] | null
          price_max?: number | null
          price_min?: number | null
          price_type?: string
          total_jobs?: number | null
          total_views?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_user_type: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
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
      business_type: "goods" | "services" | "both"
      user_role: "customer" | "business"
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
      business_type: ["goods", "services", "both"],
      user_role: ["customer", "business"],
    },
  },
} as const
