import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { StatusPill } from '@/components/StatusPill'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ArrowLeft, Truck, MapPin, Radio } from 'lucide-react'
import { format } from 'date-fns'
import type { ShipmentWithEvents } from '@/types'

const defaultCenter: [number, number] = [40.7128, -74.006]

function getMarkerIcon() {
  return L.divIcon({
    className: 'shipment-marker',
    html: `<div style="background:#0ea5e9;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export function ShipmentView() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const { orgId } = useAuth()
  const navigate = useNavigate()

  const queryClient = useQueryClient()
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          shipment_events(*)
        `)
        .eq('id', shipmentId!)
        .eq('org_id', orgId!)
        .single()
      if (error) throw error
      return data as unknown as ShipmentWithEvents
    },
    enabled: !!shipmentId && !!orgId,
  })

  const triggerMockWebhook = useMutation({
    mutationFn: async (eventIndex?: number): Promise<unknown> => {
      const { data, error } = await supabase.functions.invoke('shipment-webhook-mock', {
        body: { shipment_id: shipmentId, event_index: eventIndex ?? undefined },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] })
    },
  })

  if (isLoading || !shipment) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const hasLocation = shipment.last_lat != null && shipment.last_lng != null
  const mapCenter: [number, number] = hasLocation
    ? [shipment.last_lat!, shipment.last_lng!]
    : defaultCenter
  const events = (shipment.shipment_events ?? []).sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  )

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/pipeline')}
          className="rounded-lg p-2 text-surface-500 hover:bg-surface-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Shipment</h1>
          <p className="text-surface-500">
            {shipment.tracking_number || shipment.id.slice(0, 8)} · {shipment.carrier ?? 'Carrier'}
          </p>
        </div>
        <StatusPill status={shipment.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-surface-500">
            <Truck className="h-4 w-4" />
            Events timeline
          </h2>
          <ul className="mt-4 space-y-0">
            {events.length === 0 ? (
              <li className="py-4 text-sm text-surface-500">No events yet.</li>
            ) : (
              events.map((event) => (
                <li key={event.id} className="flex gap-4 border-l-2 border-surface-200 pl-4 py-3 first:pt-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{event.event_type}</p>
                    {event.description && (
                      <p className="text-sm text-surface-600">{event.description}</p>
                    )}
                    {event.location_name && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                        <MapPin className="h-3 w-3" />
                        {event.location_name}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-surface-400">
                      {format(new Date(event.occurred_at), 'PPp')}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-surface-500 border-b border-surface-100">
            Last known location
          </h2>
          <div className="h-80">
            <MapContainer
              center={mapCenter}
              zoom={hasLocation ? 12 : 2}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {hasLocation && (
                <Marker position={[shipment.last_lat!, shipment.last_lng!]} icon={getMarkerIcon()}>
                  <Popup>{shipment.last_location_name ?? 'Last known location'}</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          {shipment.estimated_delivery && (
            <p className="px-4 py-2 text-sm text-surface-600 border-t border-surface-100">
              Estimated delivery: {format(new Date(shipment.estimated_delivery), 'PPP')}
            </p>
          )}
          {shipment.status !== 'delivered' && (
            <div className="px-4 py-3 border-t border-surface-100">
              <button
                type="button"
                onClick={() => triggerMockWebhook.mutate(undefined)}
                disabled={triggerMockWebhook.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                <Radio className="h-4 w-4" />
                Simulate carrier update
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
