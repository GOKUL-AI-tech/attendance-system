import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { leaveApi } from '../api/endpoints';
import Badge from '../components/Badge';

// Shared by Admin ("Leave Requests") and Manager ("Leave Approvals")
export default function LeaveApprovals({ title = 'Leave Requests', subtitle = 'Review and act on leave requests' }) {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    leaveApi.list({ status: statusFilter || undefined })
      .then((res) => setRequests(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);

  async function decide(id, decision) {
    try {
      await leaveApi.decide(id, decision);
      toast.success(`Leave ${decision.toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave request');
    }
  }

  return (
    <div>
      <h1 className="section-title">{title}</h1>
      <p className="section-subtitle">{subtitle}</p>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th><th>Type</th><th>From</th><th>To</th>
                <th>Reason</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={7}>Loading...</td></tr>
              ) : requests.length === 0 ? (
                <tr className="empty-row"><td colSpan={7}>No leave requests found</td></tr>
              ) : requests.map((r) => (
                <tr key={r.leave_id}>
                  <td>{r.employee_name}</td>
                  <td>{r.leave_type}</td>
                  <td>{r.from_date}</td>
                  <td>{r.to_date}</td>
                  <td>{r.reason || '—'}</td>
                  <td><Badge value={r.status} /></td>
                  <td>
                    {r.status === 'Pending' ? (
                      <div className="btn-row">
                        <button className="btn btn-success btn-sm" onClick={() => decide(r.leave_id, 'Approved')}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={() => decide(r.leave_id, 'Rejected')}>Reject</button>
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
