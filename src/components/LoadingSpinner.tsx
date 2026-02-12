export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-surface-200 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
