export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar: string | null
          created_at: string
          updated_at: string
          creator_type: string
          platforms: string[]
          preferred_lang: string
          timezone: string
          plan_id: string
          credits_balance: number
          subscription_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_current_period_end: string | null
          stripe_price_id: string | null
          stripe_payment_method_id: string | null
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
          creator_type?: string
          platforms?: string[]
          preferred_lang?: string
          timezone?: string
          plan_id?: string
          credits_balance?: number
          subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_current_period_end?: string | null
          stripe_price_id?: string | null
          stripe_payment_method_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
          creator_type?: string
          platforms?: string[]
          preferred_lang?: string
          timezone?: string
          plan_id?: string
          credits_balance?: number
          subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_current_period_end?: string | null
          stripe_price_id?: string | null
          stripe_payment_method_id?: string | null
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          id: string
          user_id: string
          provider: string
          encrypted_key: string
          is_active: boolean
          last_validated: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: string
          encrypted_key: string
          is_active?: boolean
          last_validated?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          encrypted_key?: string
          is_active?: boolean
          last_validated?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_credentials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: string
          account_id: string
          username: string
          access_token: string
          refresh_token: string | null
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          account_id: string
          username: string
          access_token: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          account_id?: string
          username?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      projects: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      jobs: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          type: string
          status: string
          prompt: string | null
          config: Json | null
          estimated_time: number | null
          actual_time: number | null
          progress: number
          estimated_time_remaining: number | null
          metadata: Json | null
          result_asset_id: string | null
          result_post_id: string | null
          error_message: string | null
          inngest_id: string | null
          priority: number
          retry_count: number
          max_retries: number
          created_at: string
          started_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          type: string
          status?: string
          prompt?: string | null
          config?: Json | null
          estimated_time?: number | null
          actual_time?: number | null
          progress?: number
          estimated_time_remaining?: number | null
          metadata?: Json | null
          result_asset_id?: string | null
          result_post_id?: string | null
          error_message?: string | null
          inngest_id?: string | null
          priority?: number
          retry_count?: number
          max_retries?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          type?: string
          status?: string
          prompt?: string | null
          config?: Json | null
          estimated_time?: number | null
          actual_time?: number | null
          progress?: number
          estimated_time_remaining?: number | null
          metadata?: Json | null
          result_asset_id?: string | null
          result_post_id?: string | null
          error_message?: string | null
          inngest_id?: string | null
          priority?: number
          retry_count?: number
          max_retries?: number
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      assets: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          job_id: string | null
          filename: string
          original_name: string | null
          mime_type: string
          file_size: number
          duration: number | null
          width: number | null
          height: number | null
          s3_key: string
          s3_bucket: string
          s3_region: string
          public_url: string | null
          thumbnail: string | null
          generated_by: string | null
          prompt: string | null
          ai_config: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          job_id?: string | null
          filename: string
          original_name?: string | null
          mime_type: string
          file_size: number
          duration?: number | null
          width?: number | null
          height?: number | null
          s3_key: string
          s3_bucket: string
          s3_region: string
          public_url?: string | null
          thumbnail?: string | null
          generated_by?: string | null
          prompt?: string | null
          ai_config?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          job_id?: string | null
          filename?: string
          original_name?: string | null
          mime_type?: string
          file_size?: number
          duration?: number | null
          width?: number | null
          height?: number | null
          s3_key?: string
          s3_bucket?: string
          s3_region?: string
          public_url?: string | null
          thumbnail?: string | null
          generated_by?: string | null
          prompt?: string | null
          ai_config?: Json | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      posts: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          asset_id: string | null
          job_id: string | null
          title: string | null
          description: string | null
          hashtags: string[]
          platforms: string[]
          scheduled_at: string | null
          published_at: string | null
          status: string
          platform_data: Json | null
          seo_optimized: boolean
          performance_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id?: string | null
          asset_id?: string | null
          job_id?: string | null
          title?: string | null
          description?: string | null
          hashtags?: string[]
          platforms?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          status?: string
          platform_data?: Json | null
          seo_optimized?: boolean
          performance_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string | null
          asset_id?: string | null
          job_id?: string | null
          title?: string | null
          description?: string | null
          hashtags?: string[]
          platforms?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          status?: string
          platform_data?: Json | null
          seo_optimized?: boolean
          performance_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          }
        ]
      }
      prompts: {
        Row: {
          id: string
          user_id: string | null
          title: string
          content: string
          category: string | null
          tags: string[]
          usage_count: number
          last_used_at: string | null
          is_template: boolean
          is_public: boolean
          is_pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          content: string
          category?: string | null
          tags?: string[]
          usage_count?: number
          last_used_at?: string | null
          is_template?: boolean
          is_public?: boolean
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          content?: string
          category?: string | null
          tags?: string[]
          usage_count?: number
          last_used_at?: string | null
          is_template?: boolean
          is_public?: boolean
          is_pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          currency: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          credits_per_month: number
          max_generations_day: number
          max_storage_gb: number
          features: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          currency?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          credits_per_month: number
          max_generations_day: number
          max_storage_gb: number
          features?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          currency?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          credits_per_month?: number
          max_generations_day?: number
          max_storage_gb?: number
          features?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          description: string | null
          cost_eur: number | null
          job_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          description?: string | null
          cost_eur?: number | null
          job_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          description?: string | null
          cost_eur?: number | null
          job_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      usage_events: {
        Row: {
          id: string
          user_id: string | null
          job_id: string | null
          event: string
          platform: string | null
          provider: string | null
          metadata: Json | null
          cost_eur: number | null
          duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          job_id?: string | null
          event: string
          platform?: string | null
          provider?: string | null
          metadata?: Json | null
          cost_eur?: number | null
          duration?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          job_id?: string | null
          event?: string
          platform?: string | null
          provider?: string | null
          metadata?: Json | null
          cost_eur?: number | null
          duration?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_webhooks: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed: boolean
          attempts: number
          last_error: string | null
          data: Json | null
          created_at: string
          processed_at: string | null
        }
        Insert: {
          id?: string
          stripe_event_id: string
          event_type: string
          processed?: boolean
          attempts?: number
          last_error?: string | null
          data?: Json | null
          created_at?: string
          processed_at?: string | null
        }
        Update: {
          id?: string
          stripe_event_id?: string
          event_type?: string
          processed?: boolean
          attempts?: number
          last_error?: string | null
          data?: Json | null
          created_at?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          email: string
          name: string | null
          subscription_id: string | null
          subscription_status: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          default_payment_method_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          email: string
          name?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          default_payment_method_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          email?: string
          name?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          default_payment_method_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      stripe_payments: {
        Row: {
          id: string
          user_id: string
          stripe_payment_id: string
          stripe_invoice_id: string | null
          amount: number
          currency: string
          status: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_id: string
          stripe_invoice_id?: string | null
          amount: number
          currency?: string
          status: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_id?: string
          stripe_invoice_id?: string | null
          amount?: number
          currency?: string
          status?: string
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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

// Helper types for easy use
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"])[TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"])
  ? (Database["public"]["Tables"])[PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof (Database["public"]["Enums"])
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicEnumNameOrOptions["schema"]]["Enums"])
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicEnumNameOrOptions["schema"]]["Enums"])[EnumName]
  : PublicEnumNameOrOptions extends keyof (Database["public"]["Enums"])
  ? (Database["public"]["Enums"])[PublicEnumNameOrOptions]
  : never

// Type aliases for common use
export type User = Tables<"users">
export type Asset = Tables<"assets">
export type Job = Tables<"jobs">
export type Project = Tables<"projects">
export type Post = Tables<"posts">
export type Prompt = Tables<"prompts">
export type Plan = Tables<"plans">
export type ApiCredential = Tables<"api_credentials">
export type SocialAccount = Tables<"social_accounts">
export type CreditLedger = Tables<"credit_ledger">
export type UsageEvent = Tables<"usage_events">
export type StripeWebhook = Tables<"stripe_webhooks">
export type StripeCustomer = Tables<"stripe_customers">
export type StripePayment = Tables<"stripe_payments">