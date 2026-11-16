import { useEffect, useState } from 'react';
import { attendanceApi, departmentApi } from '../../api/endpoints';
import Badge from '../../components/Badge';

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    departmentApi.list().then((res) => setDepartments(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    attendanceApi.all({ date: date || undefined, departmentId: departmentId || undefined })
      .then((res) => setRecords(res.data))
      .finally(() => setLoading(false));
  }, [date, departmentId]);

  return (
    <div>
      <h1 className="section-title">Attendance Records</h1>
      <p className="section-subtitle">Company-wide daily attendance log</p>

      <div className="filter-bar">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
        </select>
        {date && <button className="btn btn-secondary btn-sm" onClick={() => setDate('')}>Clear Date</button>}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Employee</th><th>Code</th><th>Department</th>
                <th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={8}>Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>No records found</td></tr>
              ) : records.map((r) => (
                <tr key={r.attendance_id}>
                  <td>{r.work_date}</td>
                  <td>{r.employee_name}</td>
                  <td>{r.employee_code}</td>
                  <td>{r.department_name}</td>
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
