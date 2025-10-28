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
      job_bom_lines: {
        Row: {
          created_at: string
          id: string
          job_id: string
          notes: string | null
          odoo_product_id: number | null
          product_name: string
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          odoo_product_id?: number | null
          product_name: string
          quantity: number
          total_cost: number
          unit_cost: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          odoo_product_id?: number | null
          product_name?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bom_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_budget_lines: {
        Row: {
          cost_category: string
          created_at: string
          id: string
          job_id: string
          odoo_line_id: number
          product_id: number
          product_name: string
          product_type: string
          quantity: number
          subtotal: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          cost_category: string
          created_at?: string
          id?: string
          job_id: string
          odoo_line_id: number
          product_id: number
          product_name: string
          product_type: string
          quantity: number
          subtotal: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          cost_category?: string
          created_at?: string
          id?: string
          job_id?: string
          odoo_line_id?: number
          product_id?: number
          product_name?: string
          product_type?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_budget_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_non_material_costs: {
        Row: {
          amount: number
          cost_type: string
          created_at: string
          description: string | null
          id: string
          is_from_odoo: boolean
          job_id: string
          odoo_purchase_order_id: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          cost_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_from_odoo?: boolean
          job_id: string
          odoo_purchase_order_id?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cost_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_from_odoo?: boolean
          job_id?: string
          odoo_purchase_order_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_non_material_costs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_purchase_orders: {
        Row: {
          amount_total: number
          cost_category: string
          created_at: string
          id: string
          job_id: string
          odoo_po_id: number
          po_name: string
          updated_at: string
          vendor_name: string | null
        }
        Insert: {
          amount_total: number
          cost_category: string
          created_at?: string
          id?: string
          job_id: string
          odoo_po_id: number
          po_name: string
          updated_at?: string
          vendor_name?: string | null
        }
        Update: {
          amount_total?: number
          cost_category?: string
          created_at?: string
          id?: string
          job_id?: string
          odoo_po_id?: number
          po_name?: string
          updated_at?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_purchase_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          analytic_account_id: number | null
          analytic_account_name: string | null
          created_at: string
          customer_name: string
          date_order: string | null
          id: string
          material_actual: number
          material_budget: number
          non_material_actual: number
          non_material_budget: number
          odoo_sale_order_id: number
          opportunity_name: string | null
          project_manager_name: string | null
          project_stage_id: number | null
          project_stage_name: string | null
          sale_order_name: string
          sales_person_name: string | null
          status: string
          total_actual: number
          total_budget: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analytic_account_id?: number | null
          analytic_account_name?: string | null
          created_at?: string
          customer_name: string
          date_order?: string | null
          id?: string
          material_actual?: number
          material_budget?: number
          non_material_actual?: number
          non_material_budget?: number
          odoo_sale_order_id: number
          opportunity_name?: string | null
          project_manager_name?: string | null
          project_stage_id?: number | null
          project_stage_name?: string | null
          sale_order_name: string
          sales_person_name?: string | null
          status?: string
          total_actual?: number
          total_budget?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analytic_account_id?: number | null
          analytic_account_name?: string | null
          created_at?: string
          customer_name?: string
          date_order?: string | null
          id?: string
          material_actual?: number
          material_budget?: number
          non_material_actual?: number
          non_material_budget?: number
          odoo_sale_order_id?: number
          opportunity_name?: string | null
          project_manager_name?: string | null
          project_stage_id?: number | null
          project_stage_name?: string | null
          sale_order_name?: string
          sales_person_name?: string | null
          status?: string
          total_actual?: number
          total_budget?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_targets: {
        Row: {
          cfg_invoice_actual: number | null
          cfg_invoice_target: number
          cfg_invoice_variance: number | null
          cfg_sales_actual: number | null
          cfg_sales_target: number
          cfg_sales_variance: number | null
          created_at: string
          dsf_invoice_actual: number | null
          dsf_invoice_target: number
          dsf_invoice_variance: number | null
          dsf_sales_actual: number | null
          dsf_sales_target: number
          dsf_sales_variance: number | null
          financial_year: string
          id: string
          month: string
          month_date: string
          notes: string | null
          total_invoice_actual: number | null
          total_invoice_target: number | null
          total_sales_actual: number | null
          total_sales_target: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cfg_invoice_actual?: number | null
          cfg_invoice_target?: number
          cfg_invoice_variance?: number | null
          cfg_sales_actual?: number | null
          cfg_sales_target?: number
          cfg_sales_variance?: number | null
          created_at?: string
          dsf_invoice_actual?: number | null
          dsf_invoice_target?: number
          dsf_invoice_variance?: number | null
          dsf_sales_actual?: number | null
          dsf_sales_target?: number
          dsf_sales_variance?: number | null
          financial_year: string
          id?: string
          month: string
          month_date: string
          notes?: string | null
          total_invoice_actual?: number | null
          total_invoice_target?: number | null
          total_sales_actual?: number | null
          total_sales_target?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cfg_invoice_actual?: number | null
          cfg_invoice_target?: number
          cfg_invoice_variance?: number | null
          cfg_sales_actual?: number | null
          cfg_sales_target?: number
          cfg_sales_variance?: number | null
          created_at?: string
          dsf_invoice_actual?: number | null
          dsf_invoice_target?: number
          dsf_invoice_variance?: number | null
          dsf_sales_actual?: number | null
          dsf_sales_target?: number
          dsf_sales_variance?: number | null
          financial_year?: string
          id?: string
          month?: string
          month_date?: string
          notes?: string | null
          total_invoice_actual?: number | null
          total_invoice_target?: number | null
          total_sales_actual?: number | null
          total_sales_target?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sales_targets: {
        Row: {
          created_at: string
          id: string
          metric: string
          name: string
          period: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          name: string
          period: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          name?: string
          period?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
