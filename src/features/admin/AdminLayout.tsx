import AppShell from '@/components/AppShell'
export default function AdminLayout() { return <AppShell title="Odyssey Admin" nav={[{ to: '/admin', label: 'Client health', end: true }, { to: '/admin/review', label: 'Review queue' }, { to: '/admin/usage', label: 'Usage vs cost' }, { to: '/admin/onboarding', label: 'Onboarding' }]} /> }
