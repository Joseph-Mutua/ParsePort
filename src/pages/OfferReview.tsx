import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatusPill } from '@/components/StatusPill'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ArrowLeft, Check, ShoppingCart } from 'lucide-react'
import type { ParsedOffer } from '@/types'

export function OfferReview() {
  const { offerId } = useParams<{ offerId: string }>()
  const { orgId, canEdit } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [parsed] = useState<ParsedOffer | null>(null)

  const { data: offer, isLoading } = useQuery({
    queryKey: ['offer', offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          vendor:vendors(id, name, email),
          offer_items(*)
        `)
        .eq('id', offerId!)
        .eq('org_id', orgId!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!offerId && !!orgId,
  })

  const updateOffer = useMutation({
    mutationFn: async (updates: { status?: string; parsed_json?: unknown; valid_until?: string; lead_time_days?: number; notes?: string }) => {
      const { error } = await supabase
        .from('offers')
        .update(updates)
        .eq('id', offerId!)
        .eq('org_id', orgId!)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] })
      queryClient.invalidateQueries({ queryKey: ['offers', orgId] })
    },
  })

  const convertToOrder = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('convert-offer-to-order', {
        body: { offer_id: offerId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['offers', orgId] })
      queryClient.invalidateQueries({ queryKey: ['pipeline', orgId] })
      if (data?.shipment_id) navigate(`/shipments/${data.shipment_id}`)
      else navigate('/pipeline')
    },
  })

  const displayParsed = (parsed ?? (offer?.parsed_json as ParsedOffer | null)) ?? null
  const items = offer?.offer_items ?? []

  const handleApprove = () => {
    const payload: { status: string; parsed_json?: unknown } = { status: 'negotiating' }
    if (displayParsed) payload.parsed_json = displayParsed
    updateOffer.mutate(payload)
  }

  const handleConvertToOrder = () => {
    convertToOrder.mutate()
  }

  if (isLoading || !offer) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/offers')}
          className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Review offer</h1>
          <p className="text-surface-500">Original vs parsed — edit and approve.</p>
        </div>
        <StatusPill status={offer.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-500">Original</h2>
          <pre className="mt-3 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-surface-50 p-4 text-sm text-slate-700">
            {offer.raw_content || 'No raw content'}
          </pre>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-500">Parsed</h2>
          {displayParsed ? (
            <div className="mt-3 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-surface-500">Vendor</span>
                  <p className="font-medium">{displayParsed.vendor_name ?? '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500">Valid until</span>
                  <p className="font-medium">{displayParsed.valid_until ?? '—'}</p>
                </div>
                <div>
                  <span className="text-surface-500">Lead time (days)</span>
                  <p className="font-medium">{displayParsed.lead_time_days ?? '—'}</p>
                </div>
              </div>
              {displayParsed.terms && (
                <p className="text-sm text-surface-600">{displayParsed.terms}</p>
              )}
              <div>
                <span className="text-surface-500 text-sm">Line items</span>
                <ul className="mt-2 space-y-2">
                  {(displayParsed.items ?? []).map((item, i) => (
                    <li key={i} className="flex justify-between rounded bg-surface-50 px-3 py-2 text-sm">
                      <span>{item.description}</span>
                      <span className="font-mono">{item.quantity} {item.unit} × {item.unit_price}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-surface-500">No parsed data yet. Run “Parse with AI” from the inbox.</p>
          )}

          {canEdit && (
            <div className="mt-6 flex flex-wrap gap-3">
              {offer.status === 'new' && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={updateOffer.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Approve → Negotiating
                </button>
              )}
              {offer.status === 'negotiating' && (
                <button
                  type="button"
                  onClick={() => updateOffer.mutate({ status: 'accepted' })}
                  disabled={updateOffer.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Mark as Accepted
                </button>
              )}
              {(offer.status === 'accepted' || offer.status === 'negotiating') && (
                <button
                  type="button"
                  onClick={handleConvertToOrder}
                  disabled={convertToOrder.isPending || items.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Convert to order
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
