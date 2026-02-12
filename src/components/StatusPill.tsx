import type { OfferStatus, OrderStatus, ShipmentStatus } from '@/types'

type Status = OfferStatus | OrderStatus | ShipmentStatus

const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  new: { label: 'New', className: 'bg-slate-100 text-slate-700' },
  negotiating: { label: 'Negotiating', className: 'bg-amber-100 text-amber-800' },
  accepted: { label: 'Accepted', className: 'bg-emerald-100 text-emerald-800' },
  ordered: { label: 'Ordered', className: 'bg-blue-100 text-blue-800' },
  in_transit: { label: 'In Transit', className: 'bg-sky-100 text-sky-800' },
  delivered: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', className: 'bg-sky-100 text-sky-800' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  picked_up: { label: 'Picked up', className: 'bg-amber-100 text-amber-800' },
  out_for_delivery: { label: 'Out for delivery', className: 'bg-sky-100 text-sky-800' },
}

export function StatusPill({ status }: { status: Status }) {
  const config = statusConfig[status] ?? {
    label: String(status),
    className: 'bg-surface-100 text-surface-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
