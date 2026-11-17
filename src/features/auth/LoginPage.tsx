import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from './AuthProvider'
import { homeFor } from './guards'
import { isSupabaseConfigured } from '@/lib/supabase'

const DOMAIN = 'demo.odyssey.test'
const PASSWORD = 'Demo1234!'
const accounts = [
  { label: 'Harbour City Plumbing (owner)', email: `owner.harbour@${DOMAIN}` },
  { label: 'Bright Spark Electrical (owner)', email: `owner.brightspark@${DOMAIN}` },
  { label: 'CoolFlow Air Conditioning (owner)', email: `owner.coolflow@${DOMAIN}` },
  { label: 'Odyssey Admin', email: `admin@${DOMAIN}` },
]

export default function LoginPage() {
  const { session, profile, signIn } = useAuth()
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false)
  if (session && profile) return <Navigate to={homeFor(profile.role)} replace />
  const submit = async (nextEmail: string, nextPassword: string) => { setBusy(true); setError(null); const err = await signIn(nextEmail, nextPassword); if (err) setError(err); setBusy(false) }
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4"><div className="w-full max-w-md space-y-4">
    {!isSupabaseConfigured && <div role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Setup pending: the backend connection is not configured yet (missing VITE_SUPABASE_ANON_KEY), so sign-in is unavailable on this deploy.</div>}
    <Card><CardHeader><CardTitle>Odyssey Front Office</CardTitle><CardDescription>Sign in to your dashboard</CardDescription></CardHeader><CardContent>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submit(email, password) }}>
        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </CardContent></Card>
    {import.meta.env.VITE_DEMO_MODE === 'true' && <Card><CardHeader><CardTitle className="text-base">Demo accounts</CardTitle><CardDescription>One-click sign in</CardDescription></CardHeader><CardContent className="space-y-2">{accounts.map((account) => <Button key={account.email} variant="outline" className="w-full justify-start" disabled={busy} onClick={() => void submit(account.email, PASSWORD)}>{account.label}</Button>)}</CardContent></Card>}
  </div></div>
}
