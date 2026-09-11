import api from './api';

// Issues
export const issueService = {
  create: (formData) => api.post('/issues', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/issues', { params }),
  getById: (id) => api.get(`/issues/${id}`),
  getStats: () => api.get('/issues/stats'),
  getMap: () => api.get('/issues/map'),
  assign: (id, data) => api.patch(`/issues/${id}/assign`, data),
  updateStatus: (id, status) => api.patch(`/issues/${id}/status`, { status }),
  submitResolution: (id, formData) =>
    api.post(`/issues/${id}/resolution`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  verify: (id, decision, comment) => api.post(`/issues/${id}/verify`, { decision, comment }),
  delete: (id) => api.delete(`/issues/${id}`),
  checkDuplicate: (data) => api.post('/issues/check-duplicate', data),
  getHistory: (id) => api.get(`/issues/${id}/history`),
};

// Reports
export const reportService = {
  getMy: () => api.get('/reports/my'),
  getByIssue: (issueId) => api.get(`/reports/issue/${issueId}`),
};

// Departments
export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.patch(`/departments/${id}`, data),
};

// Notifications
export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Escalations
export const escalationService = {
  getAll: () => api.get('/escalations'),
  process: () => api.post('/escalations/process'),
  manual: (issueId, reason) => api.post('/escalations/manual', { issueId, reason }),
};

// Admin
export const adminService = {
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  getAnalytics: () => api.get('/admin/analytics'),
};

// Demo
export const demoService = {
  fastForward: (hours, issueId) => api.post('/demo/fast-forward', { hours, issueId }),
  getStatus: () => api.get('/demo/status'),
};

// AI
export const aiService = {
  classify: (formData) =>
    api.post('/ai/classify', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
