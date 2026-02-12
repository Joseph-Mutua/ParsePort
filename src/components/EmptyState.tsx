import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-200 bg-white py-16 px-6 text-center">
      <div className="rounded-full bg-surface-100 p-4">
        <Icon className="h-8 w-8 text-surface-400" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-surface-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
