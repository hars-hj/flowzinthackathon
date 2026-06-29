
import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './components/background/LandingPage'
import {LoginPage} from './pages/LoginPage'
import {SignupPage} from './pages/SignupPage'
import { ChatPage } from './pages/ChatPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminPage } from './pages/AdminPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
// function AuthRedirect({ children }: { children: React.ReactNode }) {
//   const { user, isLoading } = useAuth()

//   if (isLoading) {
//     return (
//       <div className="flex h-full items-center justify-center bg-background">
//         <p className="font-ui text-sm text-text-secondary">Loading…</p>
//       </div>
//     )
//   }

//   if (user) {
//     return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />
//   }

//   return children
// }

function App() {
  return (
   
      <Routes>
        <Route path="/login" element = {
         //  <AuthRedirect>
            <LoginPage />
         // </AuthRedirect>
        }>
        </Route>

        <Route path="/signup" element = { 
        //  <AuthRedirect>
            <SignupPage />
        //  </AuthRedirect>
        }>
        </Route>
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
      <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
   
  )
}

export default App