export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'admin' | 'technician' | 'mechanic'
          country_code: string
          phone: string | null
          password: string
          client_id: string | null
          workshop_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role: 'admin' | 'technician' | 'mechanic'
          country_code: string
          phone?: string | null
          password: string
          client_id?: string | null
          workshop_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'admin' | 'technician' | 'mechanic'
          country_code?: string
          phone?: string | null
          password?: string
          client_id?: string | null
          workshop_id?: string | null
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          name: string
          phone: string
          country_code: string
          email: string | null
          address: string | null
          document_number: string | null
          notes: string | null
          workshop_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          country_code: string
          email?: string | null
          address?: string | null
          document_number?: string | null
          notes?: string | null
          workshop_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          country_code?: string
          email?: string | null
          address?: string | null
          document_number?: string | null
          notes?: string | null
          workshop_id?: string | null
          updated_at?: string
        }
      }
      workshops: {
        Row: {
          id: string
          name: string
          owner_id: string
          country_code: string
          phone: string | null
          address: string | null
          email: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          country_code: string
          phone?: string | null
          address?: string | null
          email?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          country_code?: string
          phone?: string | null
          address?: string | null
          email?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          vin: string
          plate: string
          brand: string
          model: string
          year: number
          current_km: number
          client_id: string
          owner_name: string
          owner_phone: string
          owner_email: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vin: string
          plate: string
          brand: string
          model: string
          year: number
          current_km: number
          client_id: string
          owner_name: string
          owner_phone: string
          owner_email?: string | null
          photo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vin?: string
          plate?: string
          brand?: string
          model?: string
          year?: number
          current_km?: number
          client_id?: string
          owner_name?: string
          owner_phone?: string
          owner_email?: string | null
          photo_url?: string | null
          updated_at?: string
        }
      }
      work_orders: {
        Row: {
          id: string
          code: string
          vehicle_id: string
          status: 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          description: string
          diagnosis: string | null
          diagnosis_category_id: string | null
          diagnosis_issue_id: string | null
          diagnosis_notes: string | null
          items: Json
          total_cost: number
          created_by: string
          assigned_to: string | null
          check_in_at: string
          started_at: string | null
          completed_at: string | null
          estimated_completion_date: string | null
          notes: string | null
          images: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          vehicle_id: string
          status: 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high'
          description: string
          diagnosis?: string | null
          diagnosis_category_id?: string | null
          diagnosis_issue_id?: string | null
          diagnosis_notes?: string | null
          items: Json
          total_cost: number
          created_by: string
          assigned_to?: string | null
          check_in_at: string
          started_at?: string | null
          completed_at?: string | null
          estimated_completion_date?: string | null
          notes?: string | null
          images?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          vehicle_id?: string
          status?: 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled'
          priority?: 'low' | 'medium' | 'high'
          description?: string
          diagnosis?: string | null
          diagnosis_category_id?: string | null
          diagnosis_issue_id?: string | null
          diagnosis_notes?: string | null
          items?: Json
          total_cost?: number
          created_by?: string
          assigned_to?: string | null
          check_in_at?: string
          started_at?: string | null
          completed_at?: string | null
          estimated_completion_date?: string | null
          notes?: string | null
          images?: string[] | null
          updated_at?: string
        }
      }
      budgets: {
        Row: {
          id: string
          work_order_id: string
          items: Json
          total_cost: number
          notes: string | null
          sent_at: string | null
          approved_at: string | null
          rejected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          work_order_id: string
          items: Json
          total_cost: number
          notes?: string | null
          sent_at?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          work_order_id?: string
          items?: Json
          total_cost?: number
          notes?: string | null
          sent_at?: string | null
          approved_at?: string | null
          rejected_at?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          type: 'status_update' | 'budget_sent' | 'budget_approved' | 'work_completed'
          work_order_id: string
          message: string
          phone_number: string
          sent_at: string
          delivered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type: 'status_update' | 'budget_sent' | 'budget_approved' | 'work_completed'
          work_order_id: string
          message: string
          phone_number: string
          sent_at: string
          delivered: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'status_update' | 'budget_sent' | 'budget_approved' | 'work_completed'
          work_order_id?: string
          message?: string
          phone_number?: string
          sent_at?: string
          delivered?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'admin' | 'technician' | 'mechanic'
      work_order_status: 'pending' | 'in_progress' | 'waiting_approval' | 'approved' | 'completed' | 'cancelled'
      work_order_priority: 'low' | 'medium' | 'high'
      notification_type: 'status_update' | 'budget_sent' | 'budget_approved' | 'work_completed'
    }
  }
}
