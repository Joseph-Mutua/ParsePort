import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { BarChart3, TrendingUp, Package, Clock } from 'lucide-react'
import type { KpiSnapshot } from '@/types'

const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export function Analytics() {
  const { orgId } = useAuth()

  const { data: kpi, isLoading } = useQuery({
    queryKey: ['kpi-snapshot', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('kpi-snapshot', {
        body: { org_id: orgId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data as KpiSnapshot
    },
    enabled: !!orgId,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const snapshot = kpi ?? {
    total_revenue: 0,
    avg_margin_pct: 0,
    top_vendors: [],
    conversion_rate: 0,
    avg_lead_time_days: 0,
  }

  const topVendorsData = snapshot.top_vendors.map((v, i) => ({
    name: v.vendor_name.length > 15 ? v.vendor_name.slice(0, 15) + '…' : v.vendor_name,
    fullName: v.vendor_name,
    revenue: v.revenue,
    orders: v.order_count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-surface-500">Revenue, margins, and vendor performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <div className="flex items-center gap-2 text-surface-500">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Total revenue</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ${Number(snapshot.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <div className="flex items-center gap-2 text-surface-500">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm font-medium">Avg margin %</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {Number(snapshot.avg_margin_pct).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <div className="flex items-center gap-2 text-surface-500">
            <Package className="h-5 w-5" />
            <span className="text-sm font-medium">Conversion rate</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {(Number(snapshot.conversion_rate) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <div className="flex items-center gap-2 text-surface-500">
            <Clock className="h-5 w-5" />
            <span className="text-sm font-medium">Avg lead time</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {Number(snapshot.avg_lead_time_days).toFixed(0)} days
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Top vendors by revenue</h2>
          <div className="mt-4 h-80">
            {topVendorsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-surface-500">
                No vendor data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendorsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullName}
                  />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-surface-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Revenue share by vendor</h2>
          <div className="mt-4 h-80">
            {topVendorsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-surface-500">
                No vendor data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topVendorsData}
                    dataKey="revenue"
                    nameKey="fullName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {topVendorsData.map((_, i) => (
                      <Cell key={i} fill={topVendorsData[i].fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
