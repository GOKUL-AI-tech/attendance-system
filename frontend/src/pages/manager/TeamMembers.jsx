import { useEffect, useState } from 'react';
import { employeeApi } from '../../api/endpoints';
import { aiApi } from '../../api/endpoints';
import Badge from '../../components/Badge';

export default function TeamMembers() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [summaryFor, setSummaryFor] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      employeeApi.list({ search: search || undefined }).then((res) => setEmployees(res.data)).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function viewSummary(emp) {
    setSummaryFor(emp);
    setSummary(null);
    setSummaryLoading(true);
    try {
      const { data } = await aiApi.workSummary(emp.employee_id, 14);
      setSummary(data);
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div>
      <h1 className="section-title">My Team</h1>
      <p className="section-subtitle">Employees reporting to you</p>

      <div className="filter-bar">
        <input placeholder="Search team members" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="panel-grid-2">
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Code</th><th>Name</th><th>Designation</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="empty-row"><td colSpan={5}>Loading...</td></tr>
                ) : employees.length === 0 ? (
                  <tr className="empty-row"><td colSpan={5}>No team members found</td></tr>
                ) : employees.map((emp) => (
                  <tr key={emp.employee_id}>
                    <td>{emp.employee_code}</td>
                    <td>{emp.name}</td>
                    <td>{emp.designation}</td>
                    <td><Badge value={emp.status} /></td>
                    <td><button className="btn btn-secondary btn-sm" onClick={() => viewSummary(emp)}>AI Summary</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 12 }}>
            {summaryFor ? `Work Summary — ${summaryFor.name}` : 'AI Work Summary'}
          </div>
          {!summaryFor && <p className="section-subtitle">Select a team member to view their AI-generated work summary and productivity indicator.</p>}
          {summaryFor && summaryLoading && <p>Generating summary...</p>}
          {summaryFor && !summaryLoading && summary && (
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
    </div>
  );
}
