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
      admin_alerts: {
        Row: {
          created_at: string
          details: Json | null
          dismissed_at: string | null
          dismissed_by: string | null
          hit_count: number
          id: string
          status: string
          top_error: string
          top_error_hash: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          hit_count?: number
          id?: string
          status?: string
          top_error: string
          top_error_hash?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          hit_count?: number
          id?: string
          status?: string
          top_error?: string
          top_error_hash?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_messages: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          page_context: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_url: string | null
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          page_context?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          page_context?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      api_cache_versions: {
        Row: {
          resource: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          resource: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          resource?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      api_response_cache: {
        Row: {
          expires_at: string
          payload: Json
          resource: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          expires_at: string
          payload: Json
          resource: string
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          expires_at?: string
          payload?: Json
          resource?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      asset_attribute_values: {
        Row: {
          asset_id: string
          attribute_id: string
          created_at: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          asset_id: string
          attribute_id: string
          created_at?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          asset_id?: string
          attribute_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_attribute_values_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "cache_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "asset_attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          options: string[] | null
          required: boolean
          sort_order: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_settings: {
        Row: {
          auto_generate_asset_tags: boolean | null
          created_at: string
          default_categories: string[] | null
          group_duplicates: boolean | null
          id: string
          require_checkout_notes: boolean | null
          status_options: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generate_asset_tags?: boolean | null
          created_at?: string
          default_categories?: string[] | null
          group_duplicates?: boolean | null
          id?: string
          require_checkout_notes?: boolean | null
          status_options?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generate_asset_tags?: boolean | null
          created_at?: string
          default_categories?: string[] | null
          group_duplicates?: boolean | null
          id?: string
          require_checkout_notes?: boolean | null
          status_options?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asset_statuses: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      backup_config: {
        Row: {
          created_at: string
          frequency: string
          id: string
          retention_days: number
          snapshot_strategy: string
          storage_location: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          frequency?: string
          id?: string
          retention_days?: number
          snapshot_strategy?: string
          storage_location?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          frequency?: string
          id?: string
          retention_days?: number
          snapshot_strategy?: string
          storage_location?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      backup_records: {
        Row: {
          backup_size_bytes: number | null
          backup_type: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          row_count: number | null
          started_at: string
          status: string
          table_count: number | null
        }
        Insert: {
          backup_size_bytes?: number | null
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          row_count?: number | null
          started_at?: string
          status?: string
          table_count?: number | null
        }
        Update: {
          backup_size_bytes?: number | null
          backup_type?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          row_count?: number | null
          started_at?: string
          status?: string
          table_count?: number | null
        }
        Relationships: []
      }
      cache_box_files: {
        Row: {
          box_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          box_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          box_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_box_files_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "cache_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_boxes: {
        Row: {
          barcode: string | null
          box_description: string | null
          box_number: string
          box_number_alt: string | null
          container_group_id: string | null
          container_status_id: string | null
          container_type_id: string | null
          created_at: string
          created_by: string | null
          custom_data: Json | null
          id: string
          image_url: string | null
          item_count: number | null
          section_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          barcode?: string | null
          box_description?: string | null
          box_number: string
          box_number_alt?: string | null
          container_group_id?: string | null
          container_status_id?: string | null
          container_type_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          id?: string
          image_url?: string | null
          item_count?: number | null
          section_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          barcode?: string | null
          box_description?: string | null
          box_number?: string
          box_number_alt?: string | null
          container_group_id?: string | null
          container_status_id?: string | null
          container_type_id?: string | null
          created_at?: string
          created_by?: string | null
          custom_data?: Json | null
          id?: string
          image_url?: string | null
          item_count?: number | null
          section_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_boxes_container_group_id_fkey"
            columns: ["container_group_id"]
            isOneToOne: false
            referencedRelation: "container_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_boxes_container_status_id_fkey"
            columns: ["container_status_id"]
            isOneToOne: false
            referencedRelation: "container_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_boxes_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "container_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_boxes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "warehouse_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_inventory: {
        Row: {
          asset_group_id: string | null
          asset_status_id: string | null
          asset_type: string
          barcode: string | null
          box_number: string | null
          box_number_alt: string | null
          category_id: string | null
          container_group_id: string | null
          container_id: string | null
          container_status_id: string | null
          container_type_id: string | null
          created_at: string | null
          critical_stock_threshold: number | null
          custom_data: Json | null
          date_expire: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          group_year: number | null
          id: string
          id_cache_fema: string | null
          id_cache_tf: string | null
          image_url: string | null
          is_internal: boolean | null
          low_stock_threshold: number | null
          manufacturer_id: string | null
          model_part_num: string | null
          quantity_available: number | null
          quantity_out: number | null
          section: string | null
          serial_number: string | null
          updated_at: string | null
          user_id: string | null
          warehouse_location_code: string | null
        }
        Insert: {
          asset_group_id?: string | null
          asset_status_id?: string | null
          asset_type?: string
          barcode?: string | null
          box_number?: string | null
          box_number_alt?: string | null
          category_id?: string | null
          container_group_id?: string | null
          container_id?: string | null
          container_status_id?: string | null
          container_type_id?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          custom_data?: Json | null
          date_expire?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_year?: number | null
          id?: string
          id_cache_fema?: string | null
          id_cache_tf?: string | null
          image_url?: string | null
          is_internal?: boolean | null
          low_stock_threshold?: number | null
          manufacturer_id?: string | null
          model_part_num?: string | null
          quantity_available?: number | null
          quantity_out?: number | null
          section?: string | null
          serial_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_location_code?: string | null
        }
        Update: {
          asset_group_id?: string | null
          asset_status_id?: string | null
          asset_type?: string
          barcode?: string | null
          box_number?: string | null
          box_number_alt?: string | null
          category_id?: string | null
          container_group_id?: string | null
          container_id?: string | null
          container_status_id?: string | null
          container_type_id?: string | null
          created_at?: string | null
          critical_stock_threshold?: number | null
          custom_data?: Json | null
          date_expire?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          group_year?: number | null
          id?: string
          id_cache_fema?: string | null
          id_cache_tf?: string | null
          image_url?: string | null
          is_internal?: boolean | null
          low_stock_threshold?: number | null
          manufacturer_id?: string | null
          model_part_num?: string | null
          quantity_available?: number | null
          quantity_out?: number | null
          section?: string | null
          serial_number?: string | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_location_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_inventory_asset_group_id_fkey"
            columns: ["asset_group_id"]
            isOneToOne: false
            referencedRelation: "asset_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_asset_status_id_fkey"
            columns: ["asset_status_id"]
            isOneToOne: false
            referencedRelation: "asset_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "custom_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_container_group_id_fkey"
            columns: ["container_group_id"]
            isOneToOne: false
            referencedRelation: "container_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "cache_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_container_status_id_fkey"
            columns: ["container_status_id"]
            isOneToOne: false
            referencedRelation: "container_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_container_type_id_fkey"
            columns: ["container_type_id"]
            isOneToOne: false
            referencedRelation: "container_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_inventory_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          allow_rotation: boolean | null
          case_id: string
          case_type: string | null
          condition: string | null
          contents: string | null
          created_at: string
          created_by: string | null
          fragile: boolean | null
          height: number | null
          id: string
          length: number | null
          max_stack_height: number | null
          notes: string | null
          pallet_id: string
          stackable: boolean | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          allow_rotation?: boolean | null
          case_id: string
          case_type?: string | null
          condition?: string | null
          contents?: string | null
          created_at?: string
          created_by?: string | null
          fragile?: boolean | null
          height?: number | null
          id?: string
          length?: number | null
          max_stack_height?: number | null
          notes?: string | null
          pallet_id: string
          stackable?: boolean | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          allow_rotation?: boolean | null
          case_id?: string
          case_type?: string | null
          condition?: string | null
          contents?: string | null
          created_at?: string
          created_by?: string | null
          fragile?: boolean | null
          height?: number | null
          id?: string
          length?: number | null
          max_stack_height?: number | null
          notes?: string | null
          pallet_id?: string
          stackable?: boolean | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          certification_number: string | null
          certification_type: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          issuing_organization: string | null
          name: string
          notes: string | null
          staff_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          certification_number?: string | null
          certification_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date: string
          issuing_organization?: string | null
          name: string
          notes?: string | null
          staff_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          certification_number?: string | null
          certification_type?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issuing_organization?: string | null
          name?: string
          notes?: string | null
          staff_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      change_history: {
        Row: {
          action: string
          created_at: string
          field_changed: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          object_id: string
          object_type: string
          previous_value: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          object_id: string
          object_type: string
          previous_value?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          field_changed?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          object_id?: string
          object_type?: string
          previous_value?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      compliance_settings: {
        Row: {
          auto_notify_expiring: boolean | null
          created_at: string
          critical_threshold_days: number | null
          expired_severity: string | null
          expiring_soon_severity: string | null
          id: string
          missing_credential_severity: string | null
          updated_at: string
          user_id: string
          warning_threshold_days: number | null
        }
        Insert: {
          auto_notify_expiring?: boolean | null
          created_at?: string
          critical_threshold_days?: number | null
          expired_severity?: string | null
          expiring_soon_severity?: string | null
          id?: string
          missing_credential_severity?: string | null
          updated_at?: string
          user_id: string
          warning_threshold_days?: number | null
        }
        Update: {
          auto_notify_expiring?: boolean | null
          created_at?: string
          critical_threshold_days?: number | null
          expired_severity?: string | null
          expiring_soon_severity?: string | null
          id?: string
          missing_credential_severity?: string | null
          updated_at?: string
          user_id?: string
          warning_threshold_days?: number | null
        }
        Relationships: []
      }
      container_attribute_values: {
        Row: {
          attribute_id: string
          container_id: string
          created_at: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          attribute_id: string
          container_id: string
          created_at?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          attribute_id?: string
          container_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "container_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "container_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "container_attribute_values_container_id_fkey"
            columns: ["container_id"]
            isOneToOne: false
            referencedRelation: "cache_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      container_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          options: string[] | null
          required: boolean | null
          sort_order: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean | null
          sort_order?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean | null
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      container_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      container_statuses: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      container_types: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_fields: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          default_value: string | null
          field_label: string
          field_name: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          role_ids: string[] | null
          sort_order: number | null
          storage_type: string | null
          table_name: string
          updated_at: string | null
          validation_rules: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_value?: string | null
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          role_ids?: string[] | null
          sort_order?: number | null
          storage_type?: string | null
          table_name: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_value?: string | null
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          role_ids?: string[] | null
          sort_order?: number | null
          storage_type?: string | null
          table_name?: string
          updated_at?: string | null
          validation_rules?: Json | null
        }
        Relationships: []
      }
      custom_pallets: {
        Row: {
          created_at: string
          created_by: string | null
          height: number | null
          id: string
          length: number
          max_weight: number
          name: string
          pallet_type: string
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          length: number
          max_weight: number
          name: string
          pallet_type?: string
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height?: number | null
          id?: string
          length?: number
          max_weight?: number
          name?: string
          pallet_type?: string
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      custom_trailers: {
        Row: {
          created_at: string
          created_by: string | null
          height: number
          id: string
          length: number
          max_weight: number
          name: string
          notes: string | null
          updated_at: string
          width: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height: number
          id?: string
          length: number
          max_weight: number
          name: string
          notes?: string | null
          updated_at?: string
          width: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height?: number
          id?: string
          length?: number
          max_weight?: number
          name?: string
          notes?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          access_reason: string | null
          action_type: string
          admin_email: string | null
          admin_user_id: string | null
          created_at: string
          id: string
          is_admin_access: boolean
          metadata: Json | null
          object_id: string | null
          object_type: string
          page_route: string | null
          source_ip: unknown
          user_agent: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          access_reason?: string | null
          action_type?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          id?: string
          is_admin_access?: boolean
          metadata?: Json | null
          object_id?: string | null
          object_type: string
          page_route?: string | null
          source_ip?: unknown
          user_agent?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          access_reason?: string | null
          action_type?: string
          admin_email?: string | null
          admin_user_id?: string | null
          created_at?: string
          id?: string
          is_admin_access?: boolean
          metadata?: Json | null
          object_id?: string | null
          object_type?: string
          page_route?: string | null
          source_ip?: unknown
          user_agent?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      data_classifications: {
        Row: {
          classification: string
          classified_by: string | null
          column_name: string
          contains_pii: boolean
          created_at: string
          encryption_required: boolean
          id: string
          masking_required: boolean
          notes: string | null
          pii_type: string | null
          table_name: string
          updated_at: string
        }
        Insert: {
          classification?: string
          classified_by?: string | null
          column_name: string
          contains_pii?: boolean
          created_at?: string
          encryption_required?: boolean
          id?: string
          masking_required?: boolean
          notes?: string | null
          pii_type?: string | null
          table_name: string
          updated_at?: string
        }
        Update: {
          classification?: string
          classified_by?: string | null
          column_name?: string
          contains_pii?: boolean
          created_at?: string
          encryption_required?: boolean
          id?: string
          masking_required?: boolean
          notes?: string | null
          pii_type?: string | null
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_governance_policies: {
        Row: {
          auto_purge_enabled: boolean
          classification: string
          contains_pii: boolean
          created_at: string
          data_type: string
          description: string | null
          display_name: string
          id: string
          last_purge_at: string | null
          last_purge_count: number | null
          owner_team: string | null
          purge_strategy: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          auto_purge_enabled?: boolean
          classification?: string
          contains_pii?: boolean
          created_at?: string
          data_type: string
          description?: string | null
          display_name: string
          id?: string
          last_purge_at?: string | null
          last_purge_count?: number | null
          owner_team?: string | null
          purge_strategy?: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          auto_purge_enabled?: boolean
          classification?: string
          contains_pii?: boolean
          created_at?: string
          data_type?: string
          description?: string | null
          display_name?: string
          id?: string
          last_purge_at?: string | null
          last_purge_count?: number | null
          owner_team?: string | null
          purge_strategy?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_lineage: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          performed_at: string
          performed_by: string | null
          source_id: string | null
          source_table: string
          target_id: string | null
          target_table: string
          transformation_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          source_id?: string | null
          source_table: string
          target_id?: string | null
          target_table: string
          transformation_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          performed_at?: string
          performed_by?: string | null
          source_id?: string | null
          source_table?: string
          target_id?: string | null
          target_table?: string
          transformation_type?: string
        }
        Relationships: []
      }
      database_integrity_log: {
        Row: {
          affected_record_id: string | null
          affected_table: string
          anomaly_type: string
          correction_applied: string | null
          created_at: string
          description: string
          id: string
          scan_id: string
          severity: string
          snapshot_data: Json | null
        }
        Insert: {
          affected_record_id?: string | null
          affected_table: string
          anomaly_type: string
          correction_applied?: string | null
          created_at?: string
          description: string
          id?: string
          scan_id: string
          severity?: string
          snapshot_data?: Json | null
        }
        Update: {
          affected_record_id?: string | null
          affected_table?: string
          anomaly_type?: string
          correction_applied?: string | null
          created_at?: string
          description?: string
          id?: string
          scan_id?: string
          severity?: string
          snapshot_data?: Json | null
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          executed_at: string | null
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          executed_at?: string | null
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demo_feedback: {
        Row: {
          created_at: string
          email: string | null
          feature_name: string | null
          feedback_text: string | null
          id: string
          page_route: string
          rating: number
          session_id: string | null
          tags: string[] | null
          user_type: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          feature_name?: string | null
          feedback_text?: string | null
          id?: string
          page_route: string
          rating: number
          session_id?: string | null
          tags?: string[] | null
          user_type?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          feature_name?: string | null
          feedback_text?: string | null
          id?: string
          page_route?: string
          rating?: number
          session_id?: string | null
          tags?: string[] | null
          user_type?: string
        }
        Relationships: []
      }
      demo_sessions: {
        Row: {
          converted_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          user_id: string
          warehouse_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          user_id: string
          warehouse_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          user_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      employee_requirements: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          employee_id: string
          expire_date: string | null
          id: string
          issue_date: string | null
          notes: string | null
          requirement_id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          employee_id: string
          expire_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          requirement_id: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          employee_id?: string
          expire_date?: string | null
          id?: string
          issue_date?: string | null
          notes?: string | null
          requirement_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_requirements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_statuses: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar_url: string | null
          base_location: string | null
          created_at: string | null
          created_by: string | null
          custom_data: Json | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          email: string | null
          employee_id: string | null
          employee_status_id: string | null
          fema_id: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          role_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_location?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_data?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          employee_status_id?: string | null
          fema_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          role_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_location?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_data?: Json | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          email?: string | null
          employee_id?: string | null
          employee_status_id?: string | null
          fema_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          role_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_employee_status_id_fkey"
            columns: ["employee_status_id"]
            isOneToOne: false
            referencedRelation: "employee_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          asset_tag: string
          available_quantity: number
          category: string | null
          checked_out_quantity: number
          condition: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          location_in_warehouse: string | null
          manufacturer: string | null
          model: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          serial_number: string | null
          status: string
          total_quantity: number
          updated_at: string
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          asset_tag: string
          available_quantity?: number
          category?: string | null
          checked_out_quantity?: number
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location_in_warehouse?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          total_quantity?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          asset_tag?: string
          available_quantity?: number
          category?: string | null
          checked_out_quantity?: number
          condition?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          location_in_warehouse?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          serial_number?: string | null
          status?: string
          total_quantity?: number
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_checkouts: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkin_notes: string | null
          checkout_date: string
          checkout_notes: string | null
          created_at: string
          deployment_location: string | null
          due_date: string | null
          equipment_id: string
          id: string
          purpose: string | null
          quantity: number
          return_condition: string | null
          return_location: string | null
          staff_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          created_at?: string
          deployment_location?: string | null
          due_date?: string | null
          equipment_id: string
          id?: string
          purpose?: string | null
          quantity?: number
          return_condition?: string | null
          return_location?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          created_at?: string
          deployment_location?: string | null
          due_date?: string | null
          equipment_id?: string
          id?: string
          purpose?: string | null
          quantity?: number
          return_condition?: string | null
          return_location?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_checkouts_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_checkouts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          action_context: Json | null
          admin_notes: string | null
          api_endpoint: string | null
          api_status_code: number | null
          browser_info: string | null
          created_at: string
          error_hash: string | null
          hit_count: number
          id: string
          last_seen_at: string
          message: string
          page_route: string | null
          replay_bundle: Json | null
          request_method: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          stack_trace: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action_context?: Json | null
          admin_notes?: string | null
          api_endpoint?: string | null
          api_status_code?: number | null
          browser_info?: string | null
          created_at?: string
          error_hash?: string | null
          hit_count?: number
          id?: string
          last_seen_at?: string
          message: string
          page_route?: string | null
          replay_bundle?: Json | null
          request_method?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_context?: Json | null
          admin_notes?: string | null
          api_endpoint?: string | null
          api_status_code?: number | null
          browser_info?: string | null
          created_at?: string
          error_hash?: string | null
          hit_count?: number
          id?: string
          last_seen_at?: string
          message?: string
          page_route?: string | null
          replay_bundle?: Json | null
          request_method?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          stack_trace?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      export_settings: {
        Row: {
          created_at: string
          date_range_default: string | null
          default_format: string | null
          id: string
          include_headers: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_range_default?: string | null
          default_format?: string | null
          id?: string
          include_headers?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_range_default?: string | null
          default_format?: string | null
          id?: string
          include_headers?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          environment: string
          expires_at: string | null
          flag_key: string
          id: string
          is_enabled: boolean
          name: string
          notes: string | null
          owner: string | null
          rollout_percentage: number
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          flag_key: string
          id?: string
          is_enabled?: boolean
          name: string
          notes?: string | null
          owner?: string | null
          rollout_percentage?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          environment?: string
          expires_at?: string | null
          flag_key?: string
          id?: string
          is_enabled?: boolean
          name?: string
          notes?: string | null
          owner?: string | null
          rollout_percentage?: number
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      friction_events: {
        Row: {
          created_at: string
          details: Json | null
          element_label: string | null
          event_type: string
          id: string
          page_route: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          element_label?: string | null
          event_type: string
          id?: string
          page_route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          element_label?: string | null
          event_type?: string
          id?: string
          page_route?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guidance_settings: {
        Row: {
          enable_explanations: boolean
          enable_idle_hints: boolean
          enable_modal_simplification: boolean
          id: string
          sensitivity: string
          updated_at: string
          user_id: string
        }
        Insert: {
          enable_explanations?: boolean
          enable_idle_hints?: boolean
          enable_modal_simplification?: boolean
          id?: string
          sensitivity?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          enable_explanations?: boolean
          enable_idle_hints?: boolean
          enable_modal_simplification?: boolean
          id?: string
          sensitivity?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      incident_timeline: {
        Row: {
          author_id: string | null
          created_at: string
          entry_type: string
          id: string
          incident_id: string
          message: string
          new_status: string | null
          previous_status: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          incident_id: string
          message: string
          new_status?: string | null
          previous_status?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          incident_id?: string
          message?: string
          new_status?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_timeline_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_component: string
          affected_users: number | null
          created_at: string
          description: string | null
          detected_at: string
          detection_method: string | null
          error_count: number | null
          id: string
          impact_summary: string | null
          metadata: Json | null
          related_alert_ids: string[] | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          started_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_component: string
          affected_users?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detection_method?: string | null
          error_count?: number | null
          id?: string
          impact_summary?: string | null
          metadata?: Json | null
          related_alert_ids?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          started_at?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_component?: string
          affected_users?: number | null
          created_at?: string
          description?: string | null
          detected_at?: string
          detection_method?: string | null
          error_count?: number | null
          id?: string
          impact_summary?: string | null
          metadata?: Json | null
          related_alert_ids?: string[] | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          started_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_cron_tokens: {
        Row: {
          created_at: string
          name: string
          token: string
        }
        Insert: {
          created_at?: string
          name: string
          token?: string
        }
        Update: {
          created_at?: string
          name?: string
          token?: string
        }
        Relationships: []
      }
      item_checkouts: {
        Row: {
          checked_in_at: string | null
          checked_in_by: string | null
          checked_out_at: string
          checked_out_by: string
          checked_out_quantity: number
          checkin_notes: string | null
          checkout_notes: string | null
          created_at: string
          employee_id: string
          expected_return_at: string | null
          id: string
          item_id: string
          return_condition: string | null
          updated_at: string
        }
        Insert: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by: string
          checked_out_quantity?: number
          checkin_notes?: string | null
          checkout_notes?: string | null
          created_at?: string
          employee_id: string
          expected_return_at?: string | null
          id?: string
          item_id: string
          return_condition?: string | null
          updated_at?: string
        }
        Update: {
          checked_in_at?: string | null
          checked_in_by?: string | null
          checked_out_at?: string
          checked_out_by?: string
          checked_out_quantity?: number
          checkin_notes?: string | null
          checkout_notes?: string | null
          created_at?: string
          employee_id?: string
          expected_return_at?: string | null
          id?: string
          item_id?: string
          return_condition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_checkouts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_checkouts_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cache_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          case_id: string | null
          condition: string | null
          created_at: string
          created_by: string | null
          custodian: string | null
          id: string
          item_id: string
          item_name: string
          notes: string | null
          pallet_id: string | null
          quantity: number | null
          section_id: string
          total_weight: number | null
          unit_weight: number | null
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          id?: string
          item_id: string
          item_name: string
          notes?: string | null
          pallet_id?: string | null
          quantity?: number | null
          section_id: string
          total_weight?: number | null
          unit_weight?: number | null
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string | null
          custodian?: string | null
          id?: string
          item_id?: string
          item_name?: string
          notes?: string | null
          pallet_id?: string | null
          quantity?: number | null
          section_id?: string
          total_weight?: number | null
          unit_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_pallet_id_fkey"
            columns: ["pallet_id"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "warehouse_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      load_plans: {
        Row: {
          assigned_trailer_layout_id: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
          warehouse_id: string | null
          workspace_id: string | null
        }
        Insert: {
          assigned_trailer_layout_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
          warehouse_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          assigned_trailer_layout_id?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
          warehouse_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "load_plans_assigned_trailer_layout_id_fkey"
            columns: ["assigned_trailer_layout_id"]
            isOneToOne: false
            referencedRelation: "saved_trailer_layouts"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          completed_date: string | null
          cost: number | null
          created_at: string
          created_by: string | null
          description: string
          equipment_id: string
          id: string
          maintenance_type: string
          next_maintenance_date: string | null
          notes: string | null
          parts_replaced: string | null
          performed_by: string | null
          priority: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description: string
          equipment_id: string
          id?: string
          maintenance_type: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_replaced?: string | null
          performed_by?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          description?: string
          equipment_id?: string
          id?: string
          maintenance_type?: string
          next_maintenance_date?: string | null
          notes?: string | null
          parts_replaced?: string | null
          performed_by?: string | null
          priority?: string | null
          scheduled_date?: string | null
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mapping_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          field_mappings: Json
          id: string
          name: string
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings: Json
          id?: string
          name: string
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          field_mappings?: Json
          id?: string
          name?: string
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          admin_access_alerts: boolean | null
          audit_reminders: boolean | null
          certification_expiry_alerts: boolean | null
          checkout_alerts: boolean | null
          compliance_alerts: boolean | null
          created_at: string
          data_access_alerts: boolean | null
          email_enabled: boolean | null
          expiry_warning_days: number | null
          id: string
          in_app_enabled: boolean | null
          large_export_alerts: boolean | null
          large_export_threshold: number | null
          maintenance_alerts: boolean | null
          task_due_alerts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_access_alerts?: boolean | null
          audit_reminders?: boolean | null
          certification_expiry_alerts?: boolean | null
          checkout_alerts?: boolean | null
          compliance_alerts?: boolean | null
          created_at?: string
          data_access_alerts?: boolean | null
          email_enabled?: boolean | null
          expiry_warning_days?: number | null
          id?: string
          in_app_enabled?: boolean | null
          large_export_alerts?: boolean | null
          large_export_threshold?: number | null
          maintenance_alerts?: boolean | null
          task_due_alerts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_access_alerts?: boolean | null
          audit_reminders?: boolean | null
          certification_expiry_alerts?: boolean | null
          checkout_alerts?: boolean | null
          compliance_alerts?: boolean | null
          created_at?: string
          data_access_alerts?: boolean | null
          email_enabled?: boolean | null
          expiry_warning_days?: number | null
          id?: string
          in_app_enabled?: boolean | null
          large_export_alerts?: boolean | null
          large_export_threshold?: number | null
          maintenance_alerts?: boolean | null
          task_due_alerts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      page_performance: {
        Row: {
          created_at: string
          id: string
          load_time_ms: number
          page_route: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          load_time_ms: number
          page_route: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          load_time_ms?: number
          page_route?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pallet_slots: {
        Row: {
          created_at: string
          equipment_id: string | null
          id: string
          is_occupied: boolean
          last_updated: string | null
          occupancy_status: string | null
          section_id: string
          shipment_item_id: string | null
          slot_code: string
          slot_number: number
        }
        Insert: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          is_occupied?: boolean
          last_updated?: string | null
          occupancy_status?: string | null
          section_id: string
          shipment_item_id?: string | null
          slot_code: string
          slot_number: number
        }
        Update: {
          created_at?: string
          equipment_id?: string | null
          id?: string
          is_occupied?: boolean
          last_updated?: string | null
          occupancy_status?: string | null
          section_id?: string
          shipment_item_id?: string | null
          slot_code?: string
          slot_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "pallet_slots_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "warehouse_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pallet_slots_shipment_item_id_fkey"
            columns: ["shipment_item_id"]
            isOneToOne: false
            referencedRelation: "shipment_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pallets: {
        Row: {
          condition: string | null
          created_at: string
          created_by: string | null
          current_weight: number | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          max_capacity: number | null
          notes: string | null
          pallet_id: string
          pallet_type: string | null
          section_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_weight?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          max_capacity?: number | null
          notes?: string | null
          pallet_id: string
          pallet_type?: string | null
          section_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          created_by?: string | null
          current_weight?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          max_capacity?: number | null
          notes?: string | null
          pallet_id?: string
          pallet_type?: string | null
          section_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pallets_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "warehouse_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          session_id: string | null
          user_id: string | null
          value_ms: number
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          session_id?: string | null
          user_id?: string | null
          value_ms: number
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          session_id?: string | null
          user_id?: string | null
          value_ms?: number
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_role: string
          previous_role: string
          target_member_id: string | null
          target_user_id: string
          workspace_owner_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_role: string
          previous_role: string
          target_member_id?: string | null
          target_user_id: string
          workspace_owner_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_role?: string
          previous_role?: string
          target_member_id?: string | null
          target_user_id?: string
          workspace_owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_logs_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "workspace_members"
            referencedColumns: ["id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          dedupe_key: string | null
          event_source: string
          event_type: string
          id: string
          is_test: boolean
          metadata: Json | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          event_source?: string
          event_type: string
          id?: string
          is_test?: boolean
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          event_source?: string
          event_type?: string
          id?: string
          is_test?: boolean
          metadata?: Json | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          first_login_completed: boolean
          id: string
          industry: string | null
          last_login_at: string | null
          login_count: number
          onboarding_complete: boolean
          phone: string | null
          primary_use_case: string | null
          profile_completeness: number
          signup_source: string | null
          team_size: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_login_completed?: boolean
          id: string
          industry?: string | null
          last_login_at?: string | null
          login_count?: number
          onboarding_complete?: boolean
          phone?: string | null
          primary_use_case?: string | null
          profile_completeness?: number
          signup_source?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          first_login_completed?: boolean
          id?: string
          industry?: string | null
          last_login_at?: string | null
          login_count?: number
          onboarding_complete?: boolean
          phone?: string | null
          primary_use_case?: string | null
          profile_completeness?: number
          signup_source?: string | null
          team_size?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          ip_address: string | null
          key: string
          max_hits: number
          user_id: string | null
          window_seconds: number
          window_start: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id?: string
          ip_address?: string | null
          key: string
          max_hits?: number
          user_id?: string | null
          window_seconds?: number
          window_start?: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          ip_address?: string | null
          key?: string
          max_hits?: number
          user_id?: string | null
          window_seconds?: number
          window_start?: string
        }
        Relationships: []
      }
      recovery_checks: {
        Row: {
          check_type: string
          checked_at: string
          details: Json | null
          id: string
          status: string
        }
        Insert: {
          check_type: string
          checked_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Update: {
          check_type?: string
          checked_at?: string
          details?: Json | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      requirement_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          requirement_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          requirement_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          requirement_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "requirement_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_attribute_values_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirement_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          options: string[] | null
          required: boolean
          sort_order: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requirement_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          requirement_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          requirement_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          requirement_id?: string
          user_id?: string
        }
        Relationships: []
      }
      requirement_config_versions: {
        Row: {
          change_description: string | null
          changed_by: string | null
          config_snapshot: Json
          created_at: string
          id: string
          user_id: string
          version: number
        }
        Insert: {
          change_description?: string | null
          changed_by?: string | null
          config_snapshot: Json
          created_at?: string
          id?: string
          user_id: string
          version?: number
        }
        Update: {
          change_description?: string | null
          changed_by?: string | null
          config_snapshot?: Json
          created_at?: string
          id?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      requirement_configs: {
        Row: {
          check_key: string
          created_at: string
          depends_on: string[]
          enabled: boolean
          explanation: string
          group: string
          id: string
          is_core: boolean
          label: string
          priority: number
          required: boolean
          requirement_id: string
          resolve: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_key: string
          created_at?: string
          depends_on?: string[]
          enabled?: boolean
          explanation: string
          group: string
          id?: string
          is_core?: boolean
          label: string
          priority: number
          required?: boolean
          requirement_id: string
          resolve: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_key?: string
          created_at?: string
          depends_on?: string[]
          enabled?: boolean
          explanation?: string
          group?: string
          id?: string
          is_core?: boolean
          label?: string
          priority?: number
          required?: boolean
          requirement_id?: string
          resolve?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requirement_definitions: {
        Row: {
          attachment_url: string | null
          created_at: string | null
          created_by: string | null
          custom_data: Json | null
          description: string | null
          document_hint: string | null
          has_expiration: boolean | null
          id: string
          is_active: boolean | null
          is_general: boolean | null
          renewal_cycle_months: number | null
          requirement_type_id: string | null
          sort_key: number | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_data?: Json | null
          description?: string | null
          document_hint?: string | null
          has_expiration?: boolean | null
          id?: string
          is_active?: boolean | null
          is_general?: boolean | null
          renewal_cycle_months?: number | null
          requirement_type_id?: string | null
          sort_key?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_data?: Json | null
          description?: string | null
          document_hint?: string | null
          has_expiration?: boolean | null
          id?: string
          is_active?: boolean | null
          is_general?: boolean | null
          renewal_cycle_months?: number | null
          requirement_type_id?: string | null
          sort_key?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_definitions_requirement_type_id_fkey"
            columns: ["requirement_type_id"]
            isOneToOne: false
            referencedRelation: "requirement_types"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_types: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_pallet_builds: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_template: boolean
          name: string
          pallet_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean
          name: string
          pallet_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_template?: boolean
          name?: string
          pallet_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      saved_trailer_layouts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          layout_data: Json
          name: string
          trailer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout_data: Json
          name: string
          trailer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout_data?: Json
          name?: string
          trailer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_trailer_layouts_trailer_id_fkey"
            columns: ["trailer_id"]
            isOneToOne: false
            referencedRelation: "custom_trailers"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets_audit_log: {
        Row: {
          assessed_at: string
          category: string
          check_type: string
          detail: string | null
          id: string
          message: string
          recommendation: string | null
          status: string
        }
        Insert: {
          assessed_at?: string
          category: string
          check_type: string
          detail?: string | null
          id?: string
          message: string
          recommendation?: string | null
          status?: string
        }
        Update: {
          assessed_at?: string
          category?: string
          check_type?: string
          detail?: string | null
          id?: string
          message?: string
          recommendation?: string | null
          status?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          page_route: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          page_route?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          page_route?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      shipment_items: {
        Row: {
          barcode: string | null
          case_id: string | null
          condition: string | null
          created_at: string
          dimensions_height: number | null
          dimensions_length: number | null
          dimensions_width: number | null
          equipment_id: string | null
          id: string
          item_name: string
          notes: string | null
          pallet_id: string | null
          pallet_uuid: string | null
          quantity: number
          shipment_id: string
          total_weight: number | null
          unit_weight: number | null
          updated_at: string
          volume: number | null
        }
        Insert: {
          barcode?: string | null
          case_id?: string | null
          condition?: string | null
          created_at?: string
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          equipment_id?: string | null
          id?: string
          item_name: string
          notes?: string | null
          pallet_id?: string | null
          pallet_uuid?: string | null
          quantity?: number
          shipment_id: string
          total_weight?: number | null
          unit_weight?: number | null
          updated_at?: string
          volume?: number | null
        }
        Update: {
          barcode?: string | null
          case_id?: string | null
          condition?: string | null
          created_at?: string
          dimensions_height?: number | null
          dimensions_length?: number | null
          dimensions_width?: number | null
          equipment_id?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          pallet_id?: string | null
          pallet_uuid?: string | null
          quantity?: number
          shipment_id?: string
          total_weight?: number | null
          unit_weight?: number | null
          updated_at?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shipment_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_pallet_uuid_fkey"
            columns: ["pallet_uuid"]
            isOneToOne: false
            referencedRelation: "pallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_items_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          approved_by: string | null
          arrival_date: string | null
          carrier: string | null
          created_at: string
          created_by: string | null
          departure_date: string | null
          destination: string
          id: string
          notes: string | null
          origin_warehouse_id: string | null
          prepared_by: string | null
          received_at: string | null
          received_by: string | null
          shipment_number: string
          special_instructions: string | null
          status: string
          transport_type: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_by?: string | null
          arrival_date?: string | null
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination: string
          id?: string
          notes?: string | null
          origin_warehouse_id?: string | null
          prepared_by?: string | null
          received_at?: string | null
          received_by?: string | null
          shipment_number: string
          special_instructions?: string | null
          status?: string
          transport_type?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_by?: string | null
          arrival_date?: string | null
          carrier?: string | null
          created_at?: string
          created_by?: string | null
          departure_date?: string | null
          destination?: string
          id?: string
          notes?: string | null
          origin_warehouse_id?: string | null
          prepared_by?: string | null
          received_at?: string | null
          received_by?: string | null
          shipment_number?: string
          special_instructions?: string | null
          status?: string
          transport_type?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipments_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_origin_warehouse_id_fkey"
            columns: ["origin_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_prepared_by_fkey"
            columns: ["prepared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string | null
          performed_by_role: string | null
          restore_mode: string | null
          restore_timestamp: string | null
          restored_categories: string[] | null
          restored_counts: Json | null
          snapshot_id: string | null
          snapshot_name: string | null
          snapshot_timestamp: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          performed_by_role?: string | null
          restore_mode?: string | null
          restore_timestamp?: string | null
          restored_categories?: string[] | null
          restored_counts?: Json | null
          snapshot_id?: string | null
          snapshot_name?: string | null
          snapshot_timestamp?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string | null
          performed_by_role?: string | null
          restore_mode?: string | null
          restore_timestamp?: string | null
          restored_categories?: string[] | null
          restored_counts?: Json | null
          snapshot_id?: string | null
          snapshot_name?: string | null
          snapshot_timestamp?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_audit_logs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "workspace_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      space_assignments: {
        Row: {
          assigned_at: string
          created_by: string
          id: string
          load_plan_id: string | null
          pallet_id: string
          position: Json | null
          section_id: string | null
          zone_label: string | null
        }
        Insert: {
          assigned_at?: string
          created_by?: string
          id?: string
          load_plan_id?: string | null
          pallet_id: string
          position?: Json | null
          section_id?: string | null
          zone_label?: string | null
        }
        Update: {
          assigned_at?: string
          created_by?: string
          id?: string
          load_plan_id?: string | null
          pallet_id?: string
          position?: Json | null
          section_id?: string | null
          zone_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_assignments_load_plan_id_fkey"
            columns: ["load_plan_id"]
            isOneToOne: false
            referencedRelation: "load_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string | null
          employment_status: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          phone: string | null
          position: string | null
          supervisor_id: string | null
          updated_at: string
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string | null
          employment_status?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string | null
          position?: string | null
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          error_message: string | null
          event_created: string
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
          status: string
          stripe_object_id: string | null
        }
        Insert: {
          error_message?: string | null
          event_created: string
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
          status?: string
          stripe_object_id?: string | null
        }
        Update: {
          error_message?: string | null
          event_created?: string
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
          status?: string
          stripe_object_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
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
      system_announcements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "task_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attribute_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          options: string[] | null
          required: boolean
          sort_order: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string[] | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          last_reminder_sent: string | null
          location: string | null
          original_date: string | null
          priority: string
          recurrence_end_date: string | null
          recurrence_exceptions: string[] | null
          recurrence_interval: number
          recurrence_parent_id: string | null
          recurrence_type: string
          reminder_enabled: boolean | null
          section: string | null
          start_date: string
          start_time: string | null
          status: string
          task_type: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          last_reminder_sent?: string | null
          location?: string | null
          original_date?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_exceptions?: string[] | null
          recurrence_interval?: number
          recurrence_parent_id?: string | null
          recurrence_type?: string
          reminder_enabled?: boolean | null
          section?: string | null
          start_date: string
          start_time?: string | null
          status?: string
          task_type: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string[] | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          last_reminder_sent?: string | null
          location?: string | null
          original_date?: string | null
          priority?: string
          recurrence_end_date?: string | null
          recurrence_exceptions?: string[] | null
          recurrence_interval?: number
          recurrence_parent_id?: string | null
          recurrence_type?: string
          reminder_enabled?: boolean | null
          section?: string | null
          start_date?: string
          start_time?: string | null
          status?: string
          task_type?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_recurrence_parent_id_fkey"
            columns: ["recurrence_parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_attribute_values: {
        Row: {
          attribute_id: string
          created_at: string
          employee_id: string
          id: string
          updated_at: string
          value: string | null
        }
        Insert: {
          attribute_id: string
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          attribute_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_member_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "team_member_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_attribute_values_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          options: string[] | null
          required: boolean
          sort_order: number | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          options?: string[] | null
          required?: boolean
          sort_order?: number | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_roles: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      upgrade_signals: {
        Row: {
          asset_growth_rate: number | null
          asset_usage_pct: number | null
          computed_at: string
          current_plan: string | null
          id: string
          locked_feature_attempts: number | null
          score: number
          team_usage_pct: number | null
          top_signals: Json | null
          user_id: string
        }
        Insert: {
          asset_growth_rate?: number | null
          asset_usage_pct?: number | null
          computed_at?: string
          current_plan?: string | null
          id?: string
          locked_feature_attempts?: number | null
          score?: number
          team_usage_pct?: number | null
          top_signals?: Json | null
          user_id: string
        }
        Update: {
          asset_growth_rate?: number | null
          asset_usage_pct?: number | null
          computed_at?: string
          current_plan?: string | null
          id?: string
          locked_feature_attempts?: number | null
          score?: number
          team_usage_pct?: number | null
          top_signals?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          created_at: string
          current_assets: number
          current_team_members: number
          id: string
          max_assets: number
          max_team_members: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_assets?: number
          current_team_members?: number
          id?: string
          max_assets?: number
          max_team_members?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_assets?: number
          current_team_members?: number
          id?: string
          max_assets?: number
          max_team_members?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_guidance_progress: {
        Row: {
          completed: boolean
          created_at: string
          guidance_id: string
          id: string
          route: string | null
          seen: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          guidance_id: string
          id?: string
          route?: string | null
          seen?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          guidance_id?: string
          id?: string
          route?: string | null
          seen?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouse_placements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          location_code: string | null
          notes: string | null
          qty: number
          ref_id: string
          ref_type: string
          twin_object_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_code?: string | null
          notes?: string | null
          qty?: number
          ref_id: string
          ref_type: string
          twin_object_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          location_code?: string | null
          notes?: string | null
          qty?: number
          ref_id?: string
          ref_type?: string
          twin_object_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_placements_twin_object_id_fkey"
            columns: ["twin_object_id"]
            isOneToOne: false
            referencedRelation: "warehouse_twin_objects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_placements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_sections: {
        Row: {
          access_restrictions: string | null
          auto_density_alerts: boolean | null
          bay_count: number | null
          created_at: string
          created_by: string | null
          current_capacity: number
          default_pallet_type: string | null
          density_threshold_low: number | null
          density_threshold_medium: number | null
          floor_level: number | null
          gps_coordinates: string | null
          id: string
          label_color: string | null
          level_count: number | null
          location_description: string | null
          maintenance_cycle_days: number | null
          max_capacity: number
          row_count: number | null
          section_code: string
          section_name: string
          section_type: string | null
          temperature_controlled: boolean | null
          updated_at: string
          warehouse_id: string | null
          zone_grouping: string[] | null
        }
        Insert: {
          access_restrictions?: string | null
          auto_density_alerts?: boolean | null
          bay_count?: number | null
          created_at?: string
          created_by?: string | null
          current_capacity?: number
          default_pallet_type?: string | null
          density_threshold_low?: number | null
          density_threshold_medium?: number | null
          floor_level?: number | null
          gps_coordinates?: string | null
          id?: string
          label_color?: string | null
          level_count?: number | null
          location_description?: string | null
          maintenance_cycle_days?: number | null
          max_capacity?: number
          row_count?: number | null
          section_code: string
          section_name: string
          section_type?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string
          warehouse_id?: string | null
          zone_grouping?: string[] | null
        }
        Update: {
          access_restrictions?: string | null
          auto_density_alerts?: boolean | null
          bay_count?: number | null
          created_at?: string
          created_by?: string | null
          current_capacity?: number
          default_pallet_type?: string | null
          density_threshold_low?: number | null
          density_threshold_medium?: number | null
          floor_level?: number | null
          gps_coordinates?: string | null
          id?: string
          label_color?: string | null
          level_count?: number | null
          location_description?: string | null
          maintenance_cycle_days?: number | null
          max_capacity?: number
          row_count?: number | null
          section_code?: string
          section_name?: string
          section_type?: string | null
          temperature_controlled?: boolean | null
          updated_at?: string
          warehouse_id?: string | null
          zone_grouping?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_sections_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_twin_objects: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          depth: number
          height: number
          id: string
          kind: string
          label: string | null
          props: Json
          rotation: number
          updated_at: string
          warehouse_id: string
          width: number
          x: number
          y: number
          z: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          height?: number
          id?: string
          kind: string
          label?: string | null
          props?: Json
          rotation?: number
          updated_at?: string
          warehouse_id: string
          width?: number
          x?: number
          y?: number
          z?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          depth?: number
          height?: number
          id?: string
          kind?: string
          label?: string | null
          props?: Json
          rotation?: number
          updated_at?: string
          warehouse_id?: string
          width?: number
          x?: number
          y?: number
          z?: number
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_twin_objects_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          active: boolean
          address: string | null
          capacity: number | null
          city: string | null
          code: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          demo_session_id: string | null
          id: string
          is_demo: boolean | null
          location: string | null
          name: string
          state: string | null
          twin_height_ft: number | null
          twin_length_ft: number | null
          twin_width_ft: number | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          capacity?: number | null
          city?: string | null
          code: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          demo_session_id?: string | null
          id?: string
          is_demo?: boolean | null
          location?: string | null
          name: string
          state?: string | null
          twin_height_ft?: number | null
          twin_length_ft?: number | null
          twin_width_ft?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          capacity?: number | null
          city?: string | null
          code?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          demo_session_id?: string | null
          id?: string
          is_demo?: boolean | null
          location?: string | null
          name?: string
          state?: string | null
          twin_height_ft?: number | null
          twin_length_ft?: number | null
          twin_width_ft?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_demo_session_id_fkey"
            columns: ["demo_session_id"]
            isOneToOne: false
            referencedRelation: "demo_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_events: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          step: string
          user_id: string | null
          workflow_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          step: string
          user_id?: string | null
          workflow_name: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          step?: string
          user_id?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
      workspace_feature_flags: {
        Row: {
          created_at: string
          flag_id: string
          id: string
          is_enabled: boolean
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          flag_id: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          flag_id?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_feature_flags_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invite_token: string
          revoked_at: string | null
          role: string
          short_code: string | null
          status: string
          workspace_owner_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          revoked_at?: string | null
          role?: string
          short_code?: string | null
          status?: string
          workspace_owner_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invite_token?: string
          revoked_at?: string | null
          role?: string
          short_code?: string | null
          status?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_owner_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_owner_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      workspace_onboarding: {
        Row: {
          asset_completed_at: string | null
          asset_created: boolean
          completed_at: string | null
          container_completed_at: string | null
          container_created: boolean
          created_at: string
          event_completed_at: string | null
          event_created: boolean
          id: string
          onboarding_complete: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_completed_at?: string | null
          asset_created?: boolean
          completed_at?: string | null
          container_completed_at?: string | null
          container_created?: boolean
          created_at?: string
          event_completed_at?: string | null
          event_created?: boolean
          id?: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_completed_at?: string | null
          asset_created?: boolean
          completed_at?: string | null
          container_completed_at?: string | null
          container_created?: boolean
          created_at?: string
          event_completed_at?: string | null
          event_created?: boolean
          id?: string
          onboarding_complete?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_plans: {
        Row: {
          archived_at: string | null
          cancel_at_period_end: boolean
          created_at: string
          id: string
          last_stripe_event_at: string | null
          max_assets: number
          max_team_members: number
          plan: Database["public"]["Enums"]["workspace_plan"]
          status: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_end_date: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string
          user_id: string
          workspace_status: string
        }
        Insert: {
          archived_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          id?: string
          last_stripe_event_at?: string | null
          max_assets?: number
          max_team_members?: number
          plan?: Database["public"]["Enums"]["workspace_plan"]
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id: string
          workspace_status?: string
        }
        Update: {
          archived_at?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          id?: string
          last_stripe_event_at?: string | null
          max_assets?: number
          max_team_members?: number
          plan?: Database["public"]["Enums"]["workspace_plan"]
          status?: Database["public"]["Enums"]["plan_status"]
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_end_date?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string
          user_id?: string
          workspace_status?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          created_at: string
          date_format: string | null
          default_view: string | null
          exclude_from_metrics: boolean
          has_seed_data: boolean | null
          id: string
          measurement_unit: string | null
          subscription_status: string | null
          time_format: string | null
          timezone: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          workspace_name: string | null
        }
        Insert: {
          created_at?: string
          date_format?: string | null
          default_view?: string | null
          exclude_from_metrics?: boolean
          has_seed_data?: boolean | null
          id?: string
          measurement_unit?: string | null
          subscription_status?: string | null
          time_format?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          workspace_name?: string | null
        }
        Update: {
          created_at?: string
          date_format?: string | null
          default_view?: string | null
          exclude_from_metrics?: boolean
          has_seed_data?: boolean | null
          id?: string
          measurement_unit?: string | null
          subscription_status?: string | null
          time_format?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          workspace_name?: string | null
        }
        Relationships: []
      }
      workspace_snapshots: {
        Row: {
          asset_count: number | null
          container_count: number | null
          created_at: string | null
          credential_count: number | null
          employee_count: number | null
          id: string
          name: string
          pallet_count: number | null
          snapshot_data: Json | null
          snapshot_size: number | null
          snapshot_type: string | null
          storage_area_count: number | null
          task_count: number | null
          user_id: string
        }
        Insert: {
          asset_count?: number | null
          container_count?: number | null
          created_at?: string | null
          credential_count?: number | null
          employee_count?: number | null
          id?: string
          name: string
          pallet_count?: number | null
          snapshot_data?: Json | null
          snapshot_size?: number | null
          snapshot_type?: string | null
          storage_area_count?: number | null
          task_count?: number | null
          user_id: string
        }
        Update: {
          asset_count?: number | null
          container_count?: number | null
          created_at?: string | null
          credential_count?: number | null
          employee_count?: number | null
          id?: string
          name?: string
          pallet_count?: number | null
          snapshot_data?: Json | null
          snapshot_size?: number | null
          snapshot_type?: string | null
          storage_area_count?: number | null
          task_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      certifications_secure: {
        Row: {
          certification_number: string | null
          certification_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          document_url: string | null
          expiry_date: string | null
          id: string | null
          issue_date: string | null
          issuing_organization: string | null
          name: string | null
          notes: string | null
          staff_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          certification_number?: never
          certification_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_url?: never
          expiry_date?: string | null
          id?: string | null
          issue_date?: string | null
          issuing_organization?: string | null
          name?: string | null
          notes?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          certification_number?: never
          certification_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document_url?: never
          expiry_date?: string | null
          id?: string | null
          issue_date?: string | null
          issuing_organization?: string | null
          name?: string | null
          notes?: string | null
          staff_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_funnel_daily: {
        Row: {
          event_count: number | null
          event_date: string | null
          event_type: string | null
          workspace_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_workspace_invite: {
        Args: { p_token: string; p_user_id: string }
        Returns: string
      }
      admin_create_workspace_snapshot: {
        Args: { p_admin_id: string; p_name: string; p_target_user_id: string }
        Returns: string
      }
      admin_list_workspace_snapshots: {
        Args: { p_admin_id: string }
        Returns: {
          asset_count: number
          container_count: number
          created_at: string
          credential_count: number
          employee_count: number
          id: string
          name: string
          pallet_count: number
          snapshot_size: number
          snapshot_type: string
          storage_area_count: number
          task_count: number
          user_email: string
          user_id: string
          workspace_name: string
        }[]
      }
      admin_restore_workspace_snapshot: {
        Args: {
          p_admin_id: string
          p_categories?: string[]
          p_restore_mode?: string
          p_snapshot_id: string
        }
        Returns: Json
      }
      archive_workspace: { Args: { p_user_id: string }; Returns: undefined }
      assert_self_or_service: {
        Args: { p_allow_null?: boolean; p_user_id: string }
        Returns: undefined
      }
      assess_data_governance: { Args: never; Returns: Json }
      assess_secrets_integrity: { Args: never; Returns: Json }
      assess_security_posture: { Args: never; Returns: Json }
      check_error_spikes: { Args: never; Returns: Json }
      check_rate_limit: {
        Args: {
          p_key: string
          p_max_hits?: number
          p_user_id: string
          p_window_seconds?: number
        }
        Returns: Json
      }
      cleanup_rate_limits: { Args: never; Returns: number }
      compute_upgrade_scores: { Args: never; Returns: number }
      create_workspace_snapshot: {
        Args: { p_name: string; p_snapshot_type: string; p_user_id: string }
        Returns: string
      }
      decrypt_sensitive: { Args: { ciphertext: string }; Returns: string }
      detect_incidents: { Args: never; Returns: Json }
      encrypt_sensitive: { Args: { plaintext: string }; Returns: string }
      ensure_workspace_integrity: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      execute_data_purge: { Args: { p_data_type: string }; Returns: Json }
      expire_trials: { Args: never; Returns: number }
      get_auth_email: { Args: { p_user_id: string }; Returns: string }
      get_cached_assets_list: { Args: never; Returns: Json }
      get_cached_containers_list: { Args: never; Returns: Json }
      get_cached_credentials_list: { Args: never; Returns: Json }
      get_cached_team_members_list: { Args: never; Returns: Json }
      get_cached_workspace_configuration: { Args: never; Returns: Json }
      get_container_depth: { Args: { p_container_id: string }; Returns: number }
      get_dashboard_kpis: { Args: { p_user_id: string }; Returns: Json }
      get_effective_workspace_id: { Args: never; Returns: string }
      get_encryption_key: { Args: never; Returns: string }
      get_observability_metrics: { Args: never; Returns: Json }
      get_or_init_cache_version: {
        Args: { p_resource: string; p_user_id: string }
        Returns: number
      }
      get_workspace_role: {
        Args: { _user_id: string; _workspace_owner_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_permission: {
        Args: { _permission: string; _workspace_owner_id: string }
        Returns: boolean
      }
      increment_login_count: { Args: { p_user_id: string }; Returns: undefined }
      increment_rate_limit: {
        Args: { p_key: string; p_user_id: string; p_window_start: string }
        Returns: {
          hit_count: number
        }[]
      }
      is_feature_enabled: {
        Args: { p_flag_key: string; p_workspace_id?: string }
        Returns: boolean
      }
      is_in_workspace: { Args: { _data_owner_id: string }; Returns: boolean }
      is_in_workspace_created_by: {
        Args: { _created_by: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_details?: Json
          p_event_type: string
          p_ip_address?: string
          p_page_route?: string
          p_severity?: string
          p_user_agent?: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      lookup_workspace_invite: {
        Args: { p_token: string }
        Returns: {
          email: string
          invite_id: string
          role: string
          workspace_name: string
          workspace_owner_id: string
        }[]
      }
      mask_sensitive_value: {
        Args: { val: string; visible_chars?: number }
        Returns: string
      }
      plan_check_feature: {
        Args: { p_feature: string; p_user_id: string }
        Returns: undefined
      }
      plan_feature_min_tier: {
        Args: { p_feature: string }
        Returns: Database["public"]["Enums"]["workspace_plan"]
      }
      plan_item_count: { Args: { p_user_id: string }; Returns: number }
      plan_limits: {
        Args: { p_plan: Database["public"]["Enums"]["workspace_plan"] }
        Returns: {
          max_assets: number
          max_locations: number
          max_users: number
        }[]
      }
      plan_owner_for_user: { Args: { p_user_id: string }; Returns: string }
      plan_tier_rank: {
        Args: { p_plan: Database["public"]["Enums"]["workspace_plan"] }
        Returns: number
      }
      purge_soft_deleted_records: { Args: never; Returns: Json }
      reorder_custom_fields: {
        Args: {
          p_field_ids: string[]
          p_new_orders: number[]
          p_table_name: string
        }
        Returns: undefined
      }
      restore_soft_deleted: {
        Args: { p_id: string; p_table: string }
        Returns: boolean
      }
      restore_workspace: { Args: { p_user_id: string }; Returns: undefined }
      restore_workspace_snapshot: {
        Args: {
          p_categories?: string[]
          p_restore_mode?: string
          p_snapshot_id: string
          p_user_id: string
        }
        Returns: Json
      }
      run_integrity_scan: { Args: never; Returns: Json }
      run_recovery_assessment: { Args: never; Returns: Json }
      trigger_demo_cleanup: { Args: never; Returns: undefined }
      upsert_error_log: {
        Args: {
          p_action_context?: Json
          p_api_endpoint: string
          p_api_status_code: number
          p_browser_info: string
          p_error_hash: string
          p_message: string
          p_page_route: string
          p_replay_bundle?: Json
          p_request_method: string
          p_severity: string
          p_stack_trace: string
          p_user_email?: string
          p_user_id: string
          p_workspace_id?: string
        }
        Returns: undefined
      }
      validate_alphanumeric_id: {
        Args: { field_name: string; id_value: string }
        Returns: boolean
      }
      validate_workspace_context: { Args: never; Returns: Json }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "technician"
        | "staff"
        | "viewer"
        | "super_admin"
      plan_status:
        | "active"
        | "over_limit"
        | "read_only"
        | "past_due"
        | "archived"
        | "trial"
      workspace_plan:
        | "inventory"
        | "operations"
        | "operations_pro"
        | "enterprise"
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
    Enums: {
      app_role: [
        "admin",
        "manager",
        "technician",
        "staff",
        "viewer",
        "super_admin",
      ],
      plan_status: [
        "active",
        "over_limit",
        "read_only",
        "past_due",
        "archived",
        "trial",
      ],
      workspace_plan: [
        "inventory",
        "operations",
        "operations_pro",
        "enterprise",
      ],
    },
  },
} as const
