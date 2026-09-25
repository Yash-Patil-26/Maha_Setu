import DashboardLayout from './pages/DashboardLayout.jsx'
import OfficerDashboard from './pages/OfficerDashboard.jsx'
import OfficerApplicationPage from './pages/OfficerApplicationPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminSystemsPage from './pages/AdminSystemsPage.jsx'
import AdminStudioPage from './pages/AdminStudioPage.jsx'
import AdminAuditPage from './pages/AdminAuditPage.jsx'
import AdminJourneysPage from './pages/AdminJourneysPage.jsx'

import CitizenDashboard from './pages/CitizenDashboard.jsx'
import CitizenApplyPage from './pages/CitizenApplyPage.jsx'
import CitizenApplicationPage from './pages/CitizenApplicationPage.jsx'
import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute roles={['citizen']} />}>
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/citizen/apply/:journeyId" element={<CitizenApplyPage />} />
        <Route
          path="/citizen/applications/:id"
          element={<CitizenApplicationPage />}
        />
        <Route path="/citizen/consents" element={<PlaceholderPage />} />
        <Route path="/citizen/profile" element={<PlaceholderPage />} />
      </Route>


      <Route element={<ProtectedRoute roles={['officer']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route
            path="/officer/applications/:id"
            element={<OfficerApplicationPage />}
          />
          <Route
            path="/officer/conflicts"
            element={<PlaceholderPage />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route
            path="/admin" element={<AdminDashboard />}
          />

          <Route
            path="/admin/systems"
            element={<AdminSystemsPage />}
          />

          <Route
            path="/admin/studio"
            element={<AdminStudioPage />}
          />
          <Route
            path="/admin/studio/:connectorId"
            element={<PlaceholderPage />}
          />
          <Route
            path="/admin/audit"
            element={<AdminAuditPage />}
          />
          <Route
            path="/admin/journeys"
            element={<AdminJourneysPage />}
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App