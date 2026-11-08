import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import AppShell from './components/layout/AppShell.jsx';
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import BrandsPage from './pages/BrandsPage.jsx';
import ConflictsPage from './pages/ConflictsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EmployeesPage from './pages/EmployeesPage.jsx';
import LeavePage from './pages/LeavePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import PodsPage from './pages/PodsPage.jsx';
import ProcessesPage from './pages/ProcessesPage.jsx';
import RosterPage from './pages/RosterPage.jsx';
import WorkingRulesPage from './pages/WorkingRulesPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="employees" element={<EmployeesPage />} />
              <Route path="brands" element={<BrandsPage />} />
              <Route path="processes" element={<ProcessesPage />} />
              <Route path="pods" element={<PodsPage />} />
              <Route path="assignments" element={<AssignmentsPage />} />
              <Route path="working-rules" element={<WorkingRulesPage />} />
              <Route path="leave" element={<LeavePage />} />
              <Route path="roster" element={<RosterPage />} />
              <Route path="conflicts" element={<ConflictsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
