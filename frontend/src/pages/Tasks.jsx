import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { taskApi, employeeApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/Badge';

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Completed'];

export default function Tasks() {
  const { user } = useAuth();
  const canAssign = user.role === 'manager' || user.role === 'admin';

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', assignedTo: '', priority: 'Medium', dueDate: '' });

  function load() {
    setLoading(true);
    taskApi.list({ status: statusFilter || undefined }).then((res) => setTasks(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, [statusFilter]);
  useEffect(() => {
    if (canAssign) employeeApi.list().then((res) => setEmployees(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await taskApi.create(form);
      toast.success('Task created');
      setShowForm(false);
      setForm({ title: '', description: '', assignedTo: '', priority: 'Medium', dueDate: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    }
  }

  async function handleStatusChange(task, status) {
    try {
      await taskApi.updateStatus(task.task_id, status);
      toast.success('Task status updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  }

  return (
    <div>
      <h1 className="section-title">{canAssign ? 'Task Management' : 'My Tasks'}</h1>
      <p className="section-subtitle">{canAssign ? 'Assign and track tasks for your team' : 'View and update the status of your assigned tasks'}</p>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {canAssign && <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>+ New Task</button>}
      </div>

      {showForm && canAssign && (
        <div className="panel">
          <div className="panel-title" style={{ marginBottom: 12 }}>Create Task</div>
          <form onSubmit={handleCreate}>
            <div className="form-grid">
              <div className="form-field full">
                <label>Title</label>
                <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-field full">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Assigned To</label>
                <select required value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}>
                  <option value="">Select employee</option>
                  {employees.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option>Low</option><option>Medium</option><option>High</option>
                </select>
              </div>
              <div className="form-field">
                <label>Due Date</label>
                <input type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Create Task</button>
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
                <th>Title</th>
                {canAssign && <th>Assigned To</th>}
                <th>Priority</th><th>Due Date</th><th>Status</th><th>Update</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={6}>Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr className="empty-row"><td colSpan={6}>No tasks found</td></tr>
              ) : tasks.map((t) => (
                <tr key={t.task_id}>
                  <td>{t.title}</td>
                  {canAssign && <td>{t.assignee_name}</td>}
                  <td><Badge value={t.priority} /></td>
                  <td>{t.due_date}</td>
                  <td><Badge value={t.status} /></td>
                  <td>
                    <select
                      value={t.status}
                      onChange={(e) => handleStatusChange(t, e.target.value)}
                      disabled={canAssign && user.role !== 'admin' && false}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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
