// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './components/login-page'
import Dashboard from './components/administrator/dashboard/dashboard'

/** Returns true if a valid, non-expired session exists in localStorage */
function isSessionValid(): boolean {
  const token     = localStorage.getItem('session_token')
  const expiresAt = localStorage.getItem('session_expires_at')
  if (!token || !expiresAt) return false
  // Clear stale session automatically if it has expired
  if (new Date(expiresAt) <= new Date()) {
    localStorage.removeItem('session_token')
    localStorage.removeItem('session_user_id')
    localStorage.removeItem('session_user_full_name')
    localStorage.removeItem('session_user_role')
    localStorage.removeItem('session_expires_at')
    return false
  }
  return true
}

// Redirects to /dashboard if already logged in with a valid session
function PublicRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

// Redirects to / if not logged in or session has expired
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isSessionValid() ? <>{children}</> : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App