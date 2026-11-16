import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/endpoints';
import StatCard from '../../components/StatCard';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.manager().then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Failed to load dashboard.</p>;

  return (
    <div>
      <h1 className="section-title">Manager Dashboard</h1>
      <p className="section-subtitle">Overview of your team's attendance and task progress</p>

      <div className="stat-grid">
        <StatCard label="Team Members" value={data.teamMembers} accent="primary" />
        <StatCard label="Present Today" value={data.presentToday} accent="success" />
        <StatCard label="Absent Today" value={data.absent} accent="danger" />
        <StatCard label="Pending Tasks" value={data.pendingTasks} accent="warning" />
        <StatCard label="Completed Tasks" value={data.completedTasks} accent="success" />
      </div>
    </div>
  );
}
