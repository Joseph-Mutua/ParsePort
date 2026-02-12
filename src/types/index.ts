import type { OfferStatus, OrderStatus, ShipmentStatus, Role } from './database'
import type { Database } from './database'

export type { Database, OfferStatus, OrderStatus, ShipmentStatus, Role }

export interface ParsedOffer {
  vendor_name?: string
  vendor_email?: string
  valid_until?: string
  lead_time_days?: number
  terms?: string
  items: Array<{
    sku?: string
    description: string
    quantity: number
    unit: string
    unit_price: number
    moq?: number
  }>
}

export interface OfferWithRelations {
  id: string
  org_id: string
  vendor_id: string | null
  status: OfferStatus
  source_type: 'email' | 'excel' | 'manual'
  raw_content: string | null
  parsed_json: ParsedOffer | null
  document_id: string | null
  valid_until: string | null
  lead_time_days: number | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  vendor?: { id: string; name: string; email: string | null } | null
  offer_items?: Array<{
    id: string
    sku: string | null
    description: string
    quantity: number
    unit: string
    unit_price: number
    total_price: number
    moq: number | null
    sort_order: number
  }>
}

export interface ShipmentWithEvents {
  id: string
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
  shipment_events?: Array<{
    id: string
    event_type: string
    description: string | null
    location_name: string | null
    lat: number | null
    lng: number | null
    occurred_at: string
  }>
}

export interface KpiSnapshot {
  total_revenue: number
  avg_margin_pct: number
  top_vendors: Array<{ vendor_name: string; revenue: number; order_count: number }>
  conversion_rate: number
  avg_lead_time_days: number
}
