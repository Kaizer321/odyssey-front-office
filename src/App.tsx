import { Navigate, Route, Routes } from 'react-router-dom'
import { HomeRedirect, RequireRole } from '@/features/auth/guards'
import LoginPage from '@/features/auth/LoginPage'
import ClientLayout from '@/features/client/ClientLayout'
import AdminLayout from '@/features/admin/AdminLayout'
import Placeholder from '@/components/Placeholder'
import OverviewPage from '@/features/client/OverviewPage'
import ActivityPage from '@/features/client/ActivityPage'

export default function App() {
  return <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireRole allow={['owner', 'office_manager']} />}>
      <Route path="/app" element={<ClientLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="calls/:callId" element={<Placeholder title="Call detail" />} />
      </Route>
    </Route>
    <Route element={<RequireRole allow={['admin']} />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Placeholder title="Client health" />} />
        <Route path="review" element={<Placeholder title="Review queue" />} />
        <Route path="usage" element={<Placeholder title="Usage vs cost" />} />
        <Route path="onboarding" element={<Placeholder title="Onboarding tracker" />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
