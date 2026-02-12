import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { org_id } = (await req.json().catch(() => ({}))) as { org_id?: string }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const oid = org_id
    if (!oid) {
      return new Response(JSON.stringify({ error: 'org_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: orders } = await supabase
      .from('orders')
      .select('id, total_amount, offer_id, created_at')
      .eq('org_id', oid)
      .in('status', ['confirmed', 'shipped', 'delivered'])

    const totalRevenue = (orders ?? []).reduce((sum, o) => sum + Number(o.total_amount), 0)

    const { data: offers } = await supabase
      .from('offers')
      .select('id, status, lead_time_days')
      .eq('org_id', oid)

    const totalOffers = offers?.length ?? 0
    const acceptedOrOrdered = offers?.filter((o) => ['accepted', 'ordered', 'in_transit', 'delivered'].includes(o.status)).length ?? 0
    const conversionRate = totalOffers > 0 ? acceptedOrOrdered / totalOffers : 0

    const leadTimes = (offers ?? []).map((o) => o.lead_time_days).filter((d): d is number => d != null && d > 0)
    const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length : 0

    const vendorRevenues: Record<string, { revenue: number; order_count: number }> = {}
    for (const order of orders ?? []) {
      const { data: o } = await supabase.from('orders').select('vendor_id').eq('id', order.id).single()
      if (!o?.vendor_id) continue
      const { data: v } = await supabase.from('vendors').select('name').eq('id', o.vendor_id).single()
      const name = (v?.name as string) ?? 'Unknown'
      if (!vendorRevenues[name]) vendorRevenues[name] = { revenue: 0, order_count: 0 }
      vendorRevenues[name].revenue += Number(order.total_amount)
      vendorRevenues[name].order_count += 1
    }

    const topVendors = Object.entries(vendorRevenues)
      .map(([vendor_name, v]) => ({ vendor_name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    const kpi = {
      total_revenue: totalRevenue,
      avg_margin_pct: 0,
      top_vendors: topVendors,
      conversion_rate: conversionRate,
      avg_lead_time_days: avgLeadTime,
    }

    return new Response(JSON.stringify(kpi), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'KPI failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
