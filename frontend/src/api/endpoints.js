import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password })
};

export const employeeApi = {
  list: (params) => client.get('/employees', { params }),
  get: (id) => client.get(`/employees/${id}`),
  create: (data) => client.post('/employees', data),
  update: (id, data) => client.put(`/employees/${id}`, data),
  remove: (id, hard = false) => client.delete(`/employees/${id}${hard ? '?hard=true' : ''}`)
};

export const departmentApi = {
  list: () => client.get('/departments')
};

export const attendanceApi = {
  checkIn: () => client.post('/attendance/checkin'),
  checkOut: () => client.post('/attendance/checkout'),
  today: () => client.get('/attendance/today'),
  me: (params) => client.get('/attendance/me', { params }),
  all: (params) => client.get('/attendance', { params })
};

export const taskApi = {
  list: (params) => client.get('/tasks', { params }),
  create: (data) => client.post('/tasks', data),
  updateStatus: (id, status) => client.put(`/tasks/${id}/status`, { status }),
  update: (id, data) => client.put(`/tasks/${id}`, data),
  remove: (id) => client.delete(`/tasks/${id}`)
};

export const workReportApi = {
  list: (params) => client.get('/work-reports', { params }),
  submit: (data) => client.post('/work-reports', data)
};

export const leaveApi = {
  list: (params) => client.get('/leave', { params }),
  submit: (data) => client.post('/leave', data),
  decide: (id, decision) => client.put(`/leave/${id}/decision`, { decision })
};

export const dashboardApi = {
  admin: () => client.get('/dashboard/admin'),
  manager: () => client.get('/dashboard/manager'),
  employee: () => client.get('/dashboard/employee')
};

export const aiApi = {
  workSummary: (employeeId, days = 14) => client.get(`/ai/work-summary/${employeeId}`, { params: { days } })
};
