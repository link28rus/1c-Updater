import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PCsPage } from './pages/PCsPage'
import { GroupsPage } from './pages/GroupsPage'
import { DistributionsPage } from './pages/DistributionsPage'
import { TasksPage } from './pages/TasksPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AgentsPage } from './pages/AgentsPage'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  // Ждем, пока токен не будет восстановлен из localStorage
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Загрузка...</div>
      </div>
    )
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="pcs" element={<PCsPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="distributions" element={<DistributionsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App


