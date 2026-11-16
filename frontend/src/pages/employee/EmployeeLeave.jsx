import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { leaveApi } from '../../api/endpoints';
import Badge from '../../components/Badge';

export default function EmployeeLeave() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'Casual', fromDate: '', toDate: '', reason: '' });

  function load() {
    setLoading(true);
    leaveApi.list().then((res) => setRequests(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await leaveApi.submit(form);
      toast.success('Leave request submitted');
      setShowForm(false);
      setForm({ leaveType: 'Casual', fromDate: '', toDate: '', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    }
  }

  return (
    <div>
      <h1 className="section-title">My Leave</h1>
      <p className="section-subtitle">Submit and track your leave requests</p>

      <div className="filter-bar">
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>+ Apply for Leave</button>
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 12 }}>Leave Request</div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Leave Type</label>
                <select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })}>
                  <option>Sick</option><option>Casual</option><option>Paid</option><option>Unpaid</option><option>Other</option>
                </select>
              </div>
              <div />
              <div className="form-field">
                <label>From Date</label>
                <input type="date" required value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
              </div>
              <div className="form-field">
                <label>To Date</label>
                <input type="date" required value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
              </div>
              <div className="form-field full">
                <label>Reason</label>
                <textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Submit Request</button>
              <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={5}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr className="empty-row"><td colSpan={5}>No leave requests found</td></tr>
              ) : requests.map((r) => (
                <tr key={r.leave_id}>
                  <td>{r.leave_type}</td>
                  <td>{r.from_date}</td>
                  <td>{r.to_date}</td>
                  <td>{r.reason || '—'}</td>
                  <td><Badge value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
