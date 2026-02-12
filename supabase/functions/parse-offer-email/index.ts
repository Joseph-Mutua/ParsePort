import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedOffer {
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
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: offer, error: fetchErr } = await supabase
      .from('offers')
      .select('id, org_id, raw_content')
      .eq('id', offer_id)
      .single()

    if (fetchErr || !offer?.raw_content) {
      return new Response(
        JSON.stringify({ error: fetchErr?.message ?? 'Offer or raw_content not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `You are a parser for wholesale/distribution vendor emails. Extract structured data into JSON.
Return ONLY valid JSON matching this TypeScript interface (no markdown, no explanation):
{
  "vendor_name": string | null,
  "vendor_email": string | null,
  "valid_until": string | null (ISO date if mentioned),
  "lead_time_days": number | null,
  "terms": string | null,
  "items": Array<{
    "sku": string | null,
    "description": string,
    "quantity": number,
    "unit": string (e.g. "ea", "case", "kg"),
    "unit_price": number,
    "moq": number | null
  }>
}
If something is not found, use null. For items, quantity and unit_price must be numbers.`

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: offer.raw_content },
        ],
        response_format: { type: 'json_object' },
      }),
    })
    if (!openaiRes.ok) {
      const err = await openaiRes.text()
      throw new Error(`OpenAI: ${err}`)
    }
    const completion = await openaiRes.json()
    const content = completion.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty OpenAI response')

    const parsed = JSON.parse(content) as ParsedOffer
    if (!Array.isArray(parsed.items)) parsed.items = []

    let vendorId: string | null = null
    if (parsed.vendor_name && offer.org_id) {
      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .eq('org_id', offer.org_id)
        .ilike('name', parsed.vendor_name)
        .limit(1)
        .single()
      if (existing?.id) {
        vendorId = existing.id
      } else {
        const { data: newVendor } = await supabase
          .from('vendors')
          .insert({
            org_id: offer.org_id,
            name: parsed.vendor_name,
            email: parsed.vendor_email ?? null,
          })
          .select('id')
          .single()
        if (newVendor?.id) vendorId = newVendor.id
      }
    }

    const { error: updateErr } = await supabase
      .from('offers')
      .update({
        parsed_json: parsed,
        vendor_id: vendorId,
        valid_until: parsed.valid_until ?? null,
        lead_time_days: parsed.lead_time_days ?? null,
      })
      .eq('id', offer_id)

    if (updateErr) throw updateErr

    // Delete existing offer_items and insert new ones
    await supabase.from('offer_items').delete().eq('offer_id', offer_id)

    for (let i = 0; i < parsed.items.length; i++) {
      const it = parsed.items[i]
      const qty = Number(it.quantity) || 0
      const price = Number(it.unit_price) || 0
      await supabase.from('offer_items').insert({
        offer_id,
        sku: it.sku ?? null,
        description: it.description || 'Item',
        quantity: qty,
        unit: it.unit || 'ea',
        unit_price: price,
        total_price: qty * price,
        moq: it.moq != null ? Number(it.moq) : null,
        sort_order: i,
      })
    }

    return new Response(JSON.stringify({ success: true, parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Parse failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
