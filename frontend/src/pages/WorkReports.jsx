import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { workReportApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

export default function WorkReports() {
  const { user } = useAuth();
  const isEmployee = user.role === 'employee';

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().slice(0, 10),
    workCompleted: '',
    hoursWorked: '',
    taskStatus: 'In Progress',
    remarks: ''
  });

  function load() {
    setLoading(true);
    workReportApi.list().then((res) => setReports(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await workReportApi.submit(form);
      toast.success('Work report submitted');
      setShowForm(false);
      setForm({ ...form, workCompleted: '', hoursWorked: '', remarks: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report');
    }
  }

  return (
    <div>
      <h1 className="section-title">{isEmployee ? 'My Work Reports' : 'Team Work Reports'}</h1>
      <p className="section-subtitle">
        {isEmployee ? 'Submit and review your daily work reports' : 'Daily work reports submitted by your team'}
      </p>

      {isEmployee && (
        <div className="filter-bar">
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>+ Submit Today's Report</button>
        </div>
      )}

      {isEmployee && showForm && (
        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 12 }}>Daily Work Report</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Date</label>
                <input type="date" required value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Hours Worked</label>
                <input type="number" step="0.25" min="0" max="24" required value={form.hoursWorked} onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })} />
              </div>
              <div className="form-field full">
                <label>Work Completed</label>
                <textarea rows={3} required value={form.workCompleted} onChange={(e) => setForm({ ...form, workCompleted: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Task Status</label>
                <select value={form.taskStatus} onChange={(e) => setForm({ ...form, taskStatus: e.target.value })}>
                  <option>Pending</option><option>In Progress</option><option>Completed</option>
                </select>
              </div>
              <div className="form-field">
                <label>Remarks</label>
                <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Submit Report</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                {!isEmployee && <th>Employee</th>}
                <th>Work Completed</th><th>Hours</th><th>Status</th><th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={6}>Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>No work reports found</td></tr>
              ) : reports.map((r) => (
                <tr key={r.report_id}>
                  <td>{r.report_date}</td>
                  {!isEmployee && <td>{r.employee_name}</td>}
                  <td>{r.work_completed}</td>
                  <td>{r.hours_worked}</td>
                  <td><Badge value={r.task_status} /></td>
                  <td>{r.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
