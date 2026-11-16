import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeManagement from './pages/admin/EmployeeManagement';
import AdminAttendance from './pages/admin/AdminAttendance';
import LeaveApprovals from './pages/LeaveApprovals';

import ManagerDashboard from './pages/manager/ManagerDashboard';
import TeamMembers from './pages/manager/TeamMembers';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeAttendance from './pages/employee/EmployeeAttendance';
import EmployeeLeave from './pages/employee/EmployeeLeave';

import Tasks from './pages/Tasks';
import WorkReports from './pages/WorkReports';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin */}
          <Route
            path="/admin"
            element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<EmployeeManagement />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="leave" element={<LeaveApprovals title="Leave Requests" subtitle="Company-wide leave requests" />} />
          </Route>

          {/* Manager */}
          <Route
            path="/manager"
            element={<ProtectedRoute roles={['manager']}><Layout /></ProtectedRoute>}
          >
            <Route index element={<ManagerDashboard />} />
            <Route path="team" element={<TeamMembers />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<WorkReports />} />
            <Route path="leave" element={<LeaveApprovals title="Leave Approvals" subtitle="Approve or reject leave requests from your team" />} />
          </Route>

          {/* Employee */}
          <Route
            path="/employee"
            element={<ProtectedRoute roles={['employee']}><Layout /></ProtectedRoute>}
          >
            <Route index element={<EmployeeDashboard />} />
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="reports" element={<WorkReports />} />
            <Route path="leave" element={<EmployeeLeave />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
