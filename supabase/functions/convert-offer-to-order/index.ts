import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { offer_id } = (await req.json()) as { offer_id: string }
    if (!offer_id) {
      return new Response(JSON.stringify({ error: 'offer_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: offer, error: offerErr } = await supabase
      .from('offers')
      .select('id, org_id, vendor_id, created_by')
      .eq('id', offer_id)
      .single()

    if (offerErr || !offer?.org_id) {
      return new Response(JSON.stringify({ error: 'Offer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const vendorId = offer.vendor_id
    if (!vendorId) {
      return new Response(JSON.stringify({ error: 'Offer has no vendor; link a vendor first' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: items, error: itemsErr } = await supabase
      .from('offer_items')
      .select('id, sku, description, quantity, unit, unit_price, total_price, sort_order')
      .eq('offer_id', offer_id)
      .order('sort_order')

    if (itemsErr || !items?.length) {
      return new Response(JSON.stringify({ error: 'No offer items to convert' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const totalAmount = items.reduce((sum, i) => sum + Number(i.total_price), 0)

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        org_id: offer.org_id,
        offer_id: offer_id,
        vendor_id: vendorId,
        status: 'confirmed',
        total_amount: totalAmount,
        currency: 'USD',
        created_by: offer.created_by ?? null,
      })
      .select('id')
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: orderErr?.message ?? 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      const { error: oiErr } = await supabase.from('order_items').insert({
        order_id: order.id,
        offer_item_id: it.id,
        sku: it.sku,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unit_price: it.unit_price,
        total_price: it.total_price,
        sort_order: i,
      })
      if (oiErr) throw new Error(oiErr.message)
    }

    const { data: shipment, error: shipErr } = await supabase
      .from('shipments')
      .insert({
        org_id: offer.org_id,
        order_id: order.id,
        carrier: 'Demo Carrier',
        tracking_number: `TL-${Date.now()}`,
        status: 'pending',
      })
      .select('id')
      .single()

    if (shipErr) {
      console.error('Shipment create failed:', shipErr)
      // Order already created; still return order
    }

    await supabase
      .from('offers')
      .update({ status: 'ordered' })
      .eq('id', offer_id)

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        shipment_id: shipment?.id ?? null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Convert failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
