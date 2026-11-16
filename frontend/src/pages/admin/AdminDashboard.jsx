import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

const PIE_COLORS = ['#2f6fed', '#1a9e6b', '#d98a10', '#8858e0'];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.admin().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Failed to load dashboard.</p>;

  const attendanceChartData = data.attendanceOverview.map((row) => ({
    date: row.work_date?.slice(5),
    Present: Number(row.present),
    Late: Number(row.late),
    Absent: Number(row.absent),
    Leave: Number(row.leave_count)
  }));

  return (
    <div>
      <h1 className="section-title">Admin Dashboard</h1>
      <p className="section-subtitle">Company-wide attendance and workforce overview</p>

      <div className="stat-grid">
        <StatCard label="Total Employees" value={data.totalEmployees} accent="primary" />
        <StatCard label="Present Today" value={data.presentToday} accent="success" />
        <StatCard label="Absent Today" value={data.absentToday} accent="danger" />
        <StatCard label="On Leave" value={data.onLeave} accent="warning" />
        <StatCard label="Departments" value={data.totalDepartments} accent="primary" />
      </div>

      <div className="panel-grid-2">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Attendance Overview (last 14 days)</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={attendanceChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Present" stackId="a" fill="#1a9e6b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Late" stackId="a" fill="#d98a10" />
              <Bar dataKey="Absent" stackId="a" fill="#d64545" />
              <Bar dataKey="Leave" stackId="a" fill="#2f6fed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Department-wise Employees</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.departmentWise}
                dataKey="employees"
                nameKey="department"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.department}: ${entry.employees}`}
              >
                {data.departmentWise.map((entry, idx) => (
                  <Cell key={entry.department} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
