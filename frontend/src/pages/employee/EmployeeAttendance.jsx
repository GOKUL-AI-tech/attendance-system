import { useEffect, useState } from 'react';
import { attendanceApi } from '../../api/endpoints';
import Badge from '../../components/Badge';

export default function EmployeeAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    attendanceApi.me().then((res) => setRecords(res.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="section-title">My Attendance History</h1>
      <p className="section-subtitle">Your check-in, check-out and status history</p>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Working Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={5}>Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr className="empty-row"><td colSpan={5}>No attendance records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.attendance_id}>
                  <td>{r.work_date}</td>
                  <td>{r.check_in || '—'}</td>
                  <td>{r.check_out || '—'}</td>
                  <td>{r.working_hours || '—'}</td>
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
