import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = {
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/employees', label: 'Employees' },
    { to: '/admin/attendance', label: 'Attendance' },
    { to: '/admin/leave', label: 'Leave Requests' }
  ],
  manager: [
    { to: '/manager', label: 'Dashboard', end: true },
    { to: '/manager/team', label: 'My Team' },
    { to: '/manager/attendance', label: 'Attendance' },
    { to: '/manager/tasks', label: 'Tasks' },
    { to: '/manager/reports', label: 'Work Reports' },
    { to: '/manager/leave', label: 'Leave Approvals' }
  ],
  employee: [
    { to: '/employee', label: 'Dashboard', end: true },
    { to: '/employee/attendance', label: 'Attendance' },
    { to: '/employee/tasks', label: 'My Tasks' },
    { to: '/employee/reports', label: 'Work Reports' },
    { to: '/employee/leave', label: 'Leave' }
  ]
};

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = NAV_ITEMS[user?.role] || [];

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <button onClick={() => setSidebarOpen((o) => !o)}>&#9776;</button>
        <strong>Attendance System</strong>
      </div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">Work<span>Track</span></div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          Employee Attendance &amp; Work Monitoring System
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">Welcome, {user?.name?.split(' ')[0]}</div>
          <div className="topbar-user">
            <span className="role-pill">{user?.role}</span>
            <div className="user-badge">{initials(user?.name)}</div>
            <button className="logout-btn" onClick={logout}>Log out</button>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
