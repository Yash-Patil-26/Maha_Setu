import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import './App.css'

const placeholderRoutes = [
  '/citizen',
  '/citizen/apply/:journeyId',
  '/citizen/applications/:id',
  '/citizen/consents',
  '/citizen/profile',
  '/officer',
  '/officer/applications/:id',
  '/officer/conflicts',
  '/admin',
  '/admin/systems',
  '/admin/studio',
  '/admin/studio/:connectorId',
  '/admin/audit',
  '/admin/journeys',
]

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/login" replace />} />

      {placeholderRoutes.map((path) => (
        <Route key={path} path={path} element={<PlaceholderPage />} />
      ))}
    </Routes>
  )
}

export default App
