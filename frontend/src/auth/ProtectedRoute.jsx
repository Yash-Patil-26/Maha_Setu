import { Navigate, Outlet } from "react-router-dom"
import { getAuthUser } from "./storage.js"

export default function ProtectedRoute({ roles }) {
  const user = getAuthUser()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return <Outlet />
}
