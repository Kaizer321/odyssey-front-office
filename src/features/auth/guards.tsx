import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type Role } from './AuthProvider'

function Splash() { return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div> }
export function homeFor(role: Role | undefined) { return role === 'admin' ? '/admin' : '/app' }
export function RequireRole({ allow }: { allow: Role[] }) {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (!session || !profile) return <Navigate to="/login" replace />
  if (!allow.includes(profile.role)) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}
export function HomeRedirect() {
  const { session, profile, loading } = useAuth()
  if (loading) return <Splash />
  if (!session || !profile) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(profile.role)} replace />
}
