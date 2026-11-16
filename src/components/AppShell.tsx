import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthProvider'

type NavItem = { to: string; label: string; end?: boolean }
export default function AppShell({ title, nav }: { title: string; nav: NavItem[] }) {
  const { profile, signOut } = useAuth()
  return <div className="flex min-h-screen"><aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex"><div className="mb-6 px-2 text-sm font-semibold">{title}</div><nav className="flex flex-col gap-1">{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{item.label}</NavLink>)}</nav><div className="mt-auto space-y-2 border-t pt-4"><div className="px-2 text-xs text-muted-foreground"><div className="font-medium text-foreground">{profile?.full_name}</div><div>{profile?.role.replace('_', ' ')}</div></div><Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button></div></aside><main className="flex-1 p-4 md:p-8"><Outlet /></main></div>
}
