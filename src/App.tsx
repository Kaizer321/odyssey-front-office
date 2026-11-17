import { Navigate, Route, Routes } from 'react-router-dom'
import { HomeRedirect, RequireRole } from '@/features/auth/guards'
import LoginPage from '@/features/auth/LoginPage'
import ClientLayout from '@/features/client/ClientLayout'
import AdminLayout from '@/features/admin/AdminLayout'
import OverviewPage from '@/features/client/OverviewPage'
import ActivityPage from '@/features/client/ActivityPage'
import CallDetailPage from '@/features/client/CallDetailPage'
import HealthPage from '@/features/admin/HealthPage'
import ReviewPage from '@/features/admin/ReviewPage'
import UsagePage from '@/features/admin/UsagePage'
import OnboardingPage from '@/features/admin/OnboardingPage'
import ReportPage from '@/features/client/ReportPage'

export default function App() {
  return <Routes>
    <Route path="/" element={<HomeRedirect />} />
    <Route path="/login" element={<LoginPage />} />
    <Route element={<RequireRole allow={['owner', 'office_manager']} />}>
      <Route path="/app" element={<ClientLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="calls/:callId" element={<CallDetailPage />} />
        <Route path="report" element={<ReportPage />} />
      </Route>
    </Route>
    <Route element={<RequireRole allow={['admin']} />}>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<HealthPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="usage" element={<UsagePage />} />
        <Route path="onboarding" element={<OnboardingPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}
