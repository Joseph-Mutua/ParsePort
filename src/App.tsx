import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { OfferInbox } from './pages/OfferInbox'
import { OfferReview } from './pages/OfferReview'
import { Pipeline } from './pages/Pipeline'
import { ShipmentView } from './pages/ShipmentView'
import { Analytics } from './pages/Analytics'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-pulse text-surface-500">Loading…</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/offers" replace />} />
        <Route path="offers" element={<OfferInbox />} />
        <Route path="offers/:offerId/review" element={<OfferReview />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="shipments/:shipmentId" element={<ShipmentView />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
