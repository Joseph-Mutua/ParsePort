import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MOCK_EVENTS = [
  { event_type: 'Picked up', description: 'Package picked up from sender', location_name: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { event_type: 'In transit', description: 'In transit to destination', location_name: 'Philadelphia, PA', lat: 39.9526, lng: -75.1652 },
  { event_type: 'Out for delivery', description: 'Out for delivery today', location_name: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
  { event_type: 'Delivered', description: 'Delivered to recipient', location_name: 'Boston, MA', lat: 42.3601, lng: -71.0589 },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = (await req.json().catch(() => ({}))) as { shipment_id?: string; event_index?: number }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let shipmentId = body.shipment_id
    if (!shipmentId) {
      const { data: latest } = await supabase
        .from('shipments')
        .select('id')
        .in('status', ['pending', 'picked_up', 'in_transit', 'out_for_delivery'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      shipmentId = latest?.id ?? null
    }

    if (!shipmentId) {
      return new Response(JSON.stringify({ error: 'No shipment_id and no pending shipment found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const eventIndex = Math.min(body.event_index ?? 0, MOCK_EVENTS.length - 1)
    const ev = MOCK_EVENTS[eventIndex]
    const statusMap = ['picked_up', 'in_transit', 'out_for_delivery', 'delivered'] as const
    const newStatus = statusMap[eventIndex]

    const { error: eventErr } = await supabase.from('shipment_events').insert({
      shipment_id: shipmentId,
      event_type: ev.event_type,
      description: ev.description,
      location_name: ev.location_name,
      lat: ev.lat,
      lng: ev.lng,
      occurred_at: new Date().toISOString(),
    })

    if (eventErr) throw eventErr

    const estDelivery = newStatus === 'delivered'
      ? new Date().toISOString()
      : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

    const { error: updateErr } = await supabase
      .from('shipments')
      .update({
        status: newStatus,
        last_lat: ev.lat,
        last_lng: ev.lng,
        last_location_name: ev.location_name,
        estimated_delivery: estDelivery,
      })
      .eq('id', shipmentId)

    if (updateErr) throw updateErr

    return new Response(
      JSON.stringify({
        success: true,
        shipment_id: shipmentId,
        event: ev.event_type,
        status: newStatus,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Webhook failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
