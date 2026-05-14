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
      budgets: {
        Row: {
          approved_at: string | null
          created_at: string | null
          id: string
          items: Json
          notes: string | null
          rejected_at: string | null
          sent_at: string | null
          total_cost: number
          updated_at: string | null
          work_order_id: string
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          total_cost?: number
          updated_at?: string | null
          work_order_id: string
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          rejected_at?: string | null
          sent_at?: string | null
          total_cost?: number
          updated_at?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          country_code: string
          created_at: string | null
          document_number: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          workshop_id: string | null
        }
        Insert: {
          address?: string | null
          country_code: string
          created_at?: string | null
          document_number?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          workshop_id?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string
          created_at?: string | null
          document_number?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          client_id: string | null
          country_code: string
          created_at: string | null
          email: string
          id: string
          last_login_at: string | null
          name: string
          password: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          updated_at: string | null
          workshop_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          client_id?: string | null
          country_code: string
          created_at?: string | null
          email: string
          id?: string
          last_login_at?: string | null
          name: string
          password?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          workshop_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          client_id?: string | null
          country_code?: string
          created_at?: string | null
          email?: string
          id?: string
          last_login_at?: string | null
          name?: string
          password?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          updated_at?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string
          client_id: string
          created_at: string | null
          current_km: number
          id: string
          model: string
          owner_email: string | null
          owner_name: string
          owner_phone: string
          photo_url: string | null
          plate: string
          updated_at: string | null
          vin: string
          year: number
        }
        Insert: {
          brand: string
          client_id: string
          created_at?: string | null
          current_km: number
          id?: string
          model: string
          owner_email?: string | null
          owner_name: string
          owner_phone: string
          photo_url?: string | null
          plate: string
          updated_at?: string | null
          vin: string
          year: number
        }
        Update: {
          brand?: string
          client_id?: string
          created_at?: string | null
          current_km?: number
          id?: string
          model?: string
          owner_email?: string | null
          owner_name?: string
          owner_phone?: string
          photo_url?: string | null
          plate?: string
          updated_at?: string | null
          vin?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          check_in_at: string
          code: string
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          diagnosis: string | null
          diagnosis_category_id: string | null
          diagnosis_issue_id: string | null
          diagnosis_notes: string | null
          estimated_completion_date: string | null
          id: string
          images: string[] | null
          items: Json
          notes: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          started_at: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          total_cost: number
          updated_at: string | null
          vehicle_id: string
          ai_diagnostic_guide: string | null
        }
        Insert: {
          assigned_to?: string | null
          check_in_at: string
          code: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          diagnosis?: string | null
          diagnosis_category_id?: string | null
          diagnosis_issue_id?: string | null
          diagnosis_notes?: string | null
          estimated_completion_date?: string | null
          id?: string
          images?: string[] | null
          items?: Json
          notes?: string | null
          priority: Database["public"]["Enums"]["work_order_priority"]
          started_at?: string | null
          status: Database["public"]["Enums"]["work_order_status"]
          total_cost?: number
          updated_at?: string | null
          vehicle_id: string
          ai_diagnostic_guide?: string | null
        }
        Update: {
          assigned_to?: string | null
          check_in_at?: string
          code?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          diagnosis?: string | null
          diagnosis_category_id?: string | null
          diagnosis_issue_id?: string | null
          diagnosis_notes?: string | null
          estimated_completion_date?: string | null
          id?: string
          images?: string[] | null
          items?: Json
          notes?: string | null
          priority?: Database["public"]["Enums"]["work_order_priority"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["work_order_status"]
          total_cost?: number
          updated_at?: string | null
          vehicle_id?: string
          ai_diagnostic_guide?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          address: string | null
          country_code: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          country_code: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      notification_type:
      | "status_update"
      | "budget_sent"
      | "budget_approved"
      | "work_completed"
      user_role: "admin" | "technician" | "mechanic"
      work_order_priority: "low" | "medium" | "high" | "urgent"
      work_order_status:
      | "pending"
      | "in_progress"
      | "waiting_approval"
      | "approved"
      | "completed"
      | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
