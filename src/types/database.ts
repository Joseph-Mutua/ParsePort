export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Role = 'admin' | 'broker' | 'viewer'

export interface Database {
  public: {
    Tables: {
      orgs: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orgs']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orgs']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      org_members: {
        Row: {
          id: string
          org_id: string
          user_id: string
          role: Role
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['org_members']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['org_members']['Insert']>
      }
      vendors: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['vendors']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['vendors']['Insert']>
      }
      customers: {
        Row: {
          id: string
          org_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['customers']['Insert']>
      }
      offers: {
        Row: {
          id: string
          org_id: string
          vendor_id: string | null
          status: OfferStatus
          source_type: 'email' | 'excel' | 'manual'
          raw_content: string | null
          parsed_json: Json | null
          document_id: string | null
          valid_until: string | null
          lead_time_days: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['offers']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
      }
      offer_items: {
        Row: {
          id: string
          offer_id: string
          sku: string | null
          description: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          moq: number | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['offer_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['offer_items']['Insert']>
      }
      orders: {
        Row: {
          id: string
          org_id: string
          offer_id: string
          vendor_id: string
          customer_id: string | null
          status: OrderStatus
          total_amount: number
          currency: string
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['orders']['Insert']>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          offer_item_id: string
          sku: string | null
          description: string
          quantity: number
          unit: string
          unit_price: number
          total_price: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>
      }
      shipments: {
        Row: {
          id: string
          org_id: string
          order_id: string
          carrier: string | null
          tracking_number: string | null
          status: ShipmentStatus
          estimated_delivery: string | null
          last_lat: number | null
          last_lng: number | null
          last_location_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['shipments']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['shipments']['Insert']>
      }
      shipment_events: {
        Row: {
          id: string
          shipment_id: string
          event_type: string
          description: string | null
          location_name: string | null
          lat: number | null
          lng: number | null
          occurred_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['shipment_events']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shipment_events']['Insert']>
      }
      documents: {
        Row: {
          id: string
          org_id: string
          bucket: string
          path: string
          filename: string
          content_type: string | null
          size_bytes: number | null
          linked_type: 'offer' | 'order' | 'shipment' | null
          linked_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['documents']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['documents']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      offer_status: OfferStatus
      order_status: OrderStatus
      shipment_status: ShipmentStatus
    }
  }
}

export type OfferStatus =
  | 'new'
  | 'negotiating'
  | 'accepted'
  | 'ordered'
  | 'in_transit'
  | 'delivered'

export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

export type ShipmentStatus = 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered'
