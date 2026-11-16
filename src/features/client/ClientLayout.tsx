import AppShell from '@/components/AppShell'
import { useAuth } from '@/features/auth/AuthProvider'
export default function ClientLayout() { const { client } = useAuth(); return <AppShell title={client?.name ?? 'Front Office'} nav={[{ to: '/app', label: 'Overview', end: true }, { to: '/app/activity', label: 'Activity log' }]} /> }
