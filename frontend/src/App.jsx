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
        <Route path="/admin" element={<PlaceholderPage />} />
        <Route path="/admin/systems" element={<PlaceholderPage />} />
        <Route path="/admin/studio" element={<PlaceholderPage />} />
        <Route path="/admin/studio/:connectorId" element={<PlaceholderPage />} />
        <Route path="/admin/audit" element={<PlaceholderPage />} />
        <Route path="/admin/journeys" element={<PlaceholderPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App