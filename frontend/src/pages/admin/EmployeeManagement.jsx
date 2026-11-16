import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { employeeApi, departmentApi } from '../../api/endpoints';
import Badge from '../../components/Badge';

const emptyForm = {
  employeeId: null,
  name: '',
  email: '',
  password: '',
  departmentId: '',
  designation: '',
  phone: '',
  joiningDate: '',
  managerId: '',
  role: 'employee',
  status: 'active'
};

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadEmployees() {
    setLoading(true);
    try {
      const { data } = await employeeApi.list({
        search: search || undefined,
        department: departmentFilter || undefined,
        status: statusFilter || undefined
      });
      setEmployees(data);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    departmentApi.list().then((res) => setDepartments(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadEmployees, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, departmentFilter, statusFilter]);

  function openCreate() {
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(emp) {
    setForm({
      employeeId: emp.employee_id,
      name: emp.name,
      email: emp.email,
      password: '',
      departmentId: emp.department_id,
      designation: emp.designation,
      phone: emp.phone || '',
      joiningDate: emp.joining_date,
      managerId: emp.manager_employee_id || '',
      role: emp.role,
      status: emp.status
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (form.employeeId) {
        await employeeApi.update(form.employeeId, {
          name: form.name,
          email: form.email,
          departmentId: form.departmentId,
          designation: form.designation,
          phone: form.phone,
          joiningDate: form.joiningDate,
          managerId: form.managerId || null,
          status: form.status,
          role: form.role
        });
        toast.success('Employee updated');
      } else {
        await employeeApi.create({
          name: form.name,
          email: form.email,
          password: form.password,
          departmentId: form.departmentId,
          designation: form.designation,
          phone: form.phone,
          joiningDate: form.joiningDate,
          managerId: form.managerId || null,
          role: form.role
        });
        toast.success('Employee added');
      }
      setShowForm(false);
      loadEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  }

  async function handleDeactivate(emp) {
    if (!confirm(`Deactivate ${emp.name}?`)) return;
    try {
      await employeeApi.remove(emp.employee_id);
      toast.success('Employee deactivated');
      loadEmployees();
    } catch {
      toast.error('Failed to deactivate employee');
    }
  }

  const possibleManagers = employees.filter((e) => e.role === 'manager');

  return (
    <div>
      <h1 className="section-title">Employee Management</h1>
      <p className="section-subtitle">Add, edit, search and manage employee records</p>

      <div className="filter-bar">
        <input placeholder="Search by name, email, code" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Employee</button>
      </div>

      {showForm && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">{form.employeeId ? 'Edit Employee' : 'Add Employee'}</div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              {!form.employeeId && (
                <div className="form-field">
                  <label>Password</label>
                  <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
              )}
              <div className="form-field">
                <label>Department</label>
                <select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                  <option value="">Select</option>
                  {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label>Designation</label>
                <input required value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Joining Date</label>
                <input type="date" required value={form.joiningDate?.slice(0, 10) || ''} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-field">
                <label>Reporting Manager</label>
                <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
                  <option value="">None</option>
                  {possibleManagers.map((m) => (
                    <option key={m.employee_id} value={m.employee_id}>{m.name}</option>
                  ))}
                </select>
              </div>
              {form.employeeId && (
                <div className="form-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">Save</button>
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
                <th>Code</th><th>Name</th><th>Email</th><th>Department</th>
                <th>Designation</th><th>Joined</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="empty-row"><td colSpan={8}>Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr className="empty-row"><td colSpan={8}>No employees found</td></tr>
              ) : employees.map((emp) => (
                <tr key={emp.employee_id}>
                  <td>{emp.employee_code}</td>
                  <td>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>{emp.department_name}</td>
                  <td>{emp.designation}</td>
                  <td>{emp.joining_date}</td>
                  <td><Badge value={emp.status} /></td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(emp)}>Edit</button>
                      {emp.status === 'active' && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(emp)}>Deactivate</button>
                      )}
                    </div>
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
