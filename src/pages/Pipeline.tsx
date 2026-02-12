import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatusPill } from '@/components/StatusPill'
import { EmptyState } from '@/components/EmptyState'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { GitBranch, Truck } from 'lucide-react'
import type { OfferStatus } from '@/types/database'

const COLUMNS: { status: OfferStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'negotiating', label: 'Negotiating' },
  { status: 'accepted', label: 'Accepted' },
  { status: 'ordered', label: 'Ordered' },
  { status: 'in_transit', label: 'In Transit' },
  { status: 'delivered', label: 'Delivered' },
]

export function Pipeline() {
  const { orgId } = useAuth()
  const navigate = useNavigate()

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['offers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id, status, source_type, parsed_json, created_at,
          vendor:vendors(id, name)
        `)
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('id, order_id, status, tracking_number, created_at')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!orgId,
  })

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.status] = offers.filter((o) => o.status === col.status)
    return acc
  }, {} as Record<OfferStatus, typeof offers>)

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pipeline</h1>
        <p className="mt-1 text-surface-500">Offers → Negotiating → Accepted → Ordered → In Transit → Delivered</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((col) => (
            <div
              key={col.status}
              className="w-56 flex-shrink-0 rounded-xl border border-surface-200 bg-surface-50/50"
            >
              <div className="border-b border-surface-200 px-4 py-3">
                <h2 className="font-semibold text-slate-900">{col.label}</h2>
                <p className="text-xs text-surface-500">{byStatus[col.status]?.length ?? 0} offers</p>
              </div>
              <div className="min-h-[200px] space-y-2 p-2">
                {(byStatus[col.status] ?? []).map((offer) => {
                  const name = (offer.parsed_json as { vendor_name?: string })?.vendor_name ?? (offer.vendor as { name?: string })?.name ?? 'Untitled'
                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => navigate(`/offers/${offer.id}/review`)}
                      className="w-full rounded-lg border border-surface-200 bg-white p-3 text-left shadow-sm hover:border-brand-200 hover:shadow"
                    >
                      <p className="truncate font-medium text-slate-900">{name}</p>
                      <p className="mt-1 text-xs text-surface-500">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                      <StatusPill status={offer.status} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {shipments.length > 0 && (
        <div className="mt-8 rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Recent shipments</h2>
          <ul className="mt-4 space-y-2">
            {shipments.slice(0, 5).map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/shipments/${s.id}`)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-50"
                >
                  <span className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-surface-400" />
                    {s.tracking_number || s.id.slice(0, 8)}
                  </span>
                  <StatusPill status={s.status as import('@/types/database').ShipmentStatus} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {offers.length === 0 && (
        <EmptyState
          icon={GitBranch}
          title="Pipeline is empty"
          description="Add offers from the Offer Inbox, then move them through the pipeline."
          action={
            <button
              type="button"
              onClick={() => navigate('/offers')}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Go to Offer Inbox
            </button>
          }
        />
      )}
    </div>
  )
}
