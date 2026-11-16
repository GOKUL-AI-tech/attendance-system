import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardApi, attendanceApi, aiApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';
import Badge from '../../components/Badge';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  function load() {
    setLoading(true);
    dashboardApi.employee().then((res) => setData(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  useEffect(() => {
    if (!user.employeeId) return;
    setSummaryLoading(true);
    aiApi.workSummary(user.employeeId, 14).then((res) => setSummary(res.data)).finally(() => setSummaryLoading(false));
  }, [user.employeeId]);

  async function handleCheckIn() {
    setBusy(true);
    try {
      const { data: res } = await attendanceApi.checkIn();
      toast.success(`Checked in at ${res.checkIn} (${res.status})`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    try {
      const { data: res } = await attendanceApi.checkOut();
      toast.success(`Checked out at ${res.checkOut} (${res.workingHours} hrs)`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Failed to load dashboard.</p>;

  const today = data.today;
  const canCheckIn = !today || !today.check_in;
  const canCheckOut = today && today.check_in && !today.check_out;

  return (
    <div>
      <h1 className="section-title">My Dashboard</h1>
      <p className="section-subtitle">Your attendance, tasks, and leave summary</p>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Today's Attendance</div>
          {today && <Badge value={today.status} />}
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={!canCheckIn || busy} onClick={handleCheckIn}>Check In</button>
          <button className="btn btn-success" disabled={!canCheckOut || busy} onClick={handleCheckOut}>Check Out</button>
        </div>
        {today && (
          <p style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>
            Check-in: {today.check_in || '—'} &nbsp;|&nbsp; Check-out: {today.check_out || '—'} &nbsp;|&nbsp; Hours: {today.working_hours || '—'}
          </p>
        )}
      </div>

      <div className="stat-grid">
        <StatCard label="Working Hours (Month)" value={data.workingHoursThisMonth} accent="primary" />
        <StatCard label="Attendance %" value={`${data.attendancePercentage}%`} accent="success" />
        <StatCard label="Pending Tasks" value={data.pendingTasks} accent="warning" />
        <StatCard label="Completed Tasks" value={data.completedTasks} accent="success" />
        <StatCard label="Leave Balance" value={data.leaveBalance} accent="primary" />
      </div>

      <div className="panel">
        <div className="panel-title" style={{ marginBottom: 12 }}>AI Work Summary</div>
        {summaryLoading && <p>Generating your work summary...</p>}
        {!summaryLoading && summary && (
          <div className="ai-box">
            <p>{summary.summary}</p>
            <div style={{ margin: '12px 0' }}>
              <span className="ai-score">{summary.productivityIndicator.score}</span>
              <span style={{ marginLeft: 8, fontWeight: 600 }}>{summary.productivityIndicator.band}</span>
            </div>
            <div>Attendance: {summary.productivityIndicator.components.attendanceRate}% ·
              {' '}Task completion: {summary.productivityIndicator.components.taskCompletionRate}% ·
              {' '}Avg hrs/day: {summary.productivityIndicator.components.avgHoursPerDay}
            </div>
            <div className="ai-note">{summary.productivityIndicator.note}</div>
          </div>
        )}
      </div>
    </div>
  );
}
