import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { offer_id, document_id } = (await req.json()) as { offer_id: string; document_id: string }
    if (!offer_id || !document_id) {
      return new Response(JSON.stringify({ error: 'offer_id and document_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('bucket, path')
      .eq('id', document_id)
      .single()

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: fileData, error: downloadErr } = await supabase.storage
      .from(doc.bucket)
      .download(doc.path)

    if (downloadErr || !fileData) {
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buf = await fileData.arrayBuffer()
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][]

    if (rows.length < 2) {
      return new Response(JSON.stringify({ error: 'Sheet has no data rows' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const header = rows[0].map((h) => (h || '').toLowerCase())
    const col = (names: string[]) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.includes(n))
        if (i >= 0) return i
      }
      return -1
    }
    const descCol = col(['description', 'item', 'product', 'name'])
    const qtyCol = col(['quantity', 'qty', 'qty'])
    const unitCol = col(['unit', 'uom'])
    const priceCol = col(['price', 'unit price', 'unit_price'])
    const skuCol = col(['sku', 'code', 'part'])

    if (descCol < 0 || priceCol < 0) {
      return new Response(JSON.stringify({ error: 'Could not find description and price columns' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase.from('offer_items').delete().eq('offer_id', offer_id)

    const parsed: { items: Array<{ sku?: string; description: string; quantity: number; unit: string; unit_price: number }> } = { items: [] }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const desc = row[descCol]?.toString().trim()
      const price = parseFloat(row[priceCol]?.toString().replace(/[^0-9.-]/g, '') || '0')
      if (!desc || Number.isNaN(price)) continue

      const quantity = qtyCol >= 0 ? parseFloat(row[qtyCol]?.toString() || '1') : 1
      const unit = unitCol >= 0 ? (row[unitCol]?.toString() || 'ea').trim() : 'ea'
      const sku = skuCol >= 0 ? row[skuCol]?.toString().trim() : undefined

      parsed.items.push({
        sku,
        description: desc,
        quantity: Number.isNaN(quantity) ? 1 : quantity,
        unit,
        unit_price: price,
      })

      await supabase.from('offer_items').insert({
        offer_id,
        sku: sku ?? null,
        description: desc,
        quantity: Number.isNaN(quantity) ? 1 : quantity,
        unit,
        unit_price: price,
        total_price: (Number.isNaN(quantity) ? 1 : quantity) * price,
        sort_order: i - 1,
      })
    }

    await supabase
      .from('offers')
      .update({ parsed_json: parsed })
      .eq('id', offer_id)

    return new Response(JSON.stringify({ success: true, parsed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Import failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    )
  }
})
