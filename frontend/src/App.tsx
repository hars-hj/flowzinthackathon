import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/background/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { ChatPage } from './pages/ChatPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminPage } from './pages/AdminPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { AgentDashboard } from './pages/AgentDashBoard'
import { SettingsPage } from './pages/settingsPage'
import {AgentOnlyDashboard} from './pages/AgentsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/chats"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute adminOnly>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute staffOnly>
            <AgentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute adminOnly>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute staffOnly>
            <AgentOnlyDashboard />
          </ProtectedRoute>
        }
       
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App