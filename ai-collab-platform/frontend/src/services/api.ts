import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// --- Agents ---
export const agentsApi = {
  list: () => api.get('/agents'),
  online: () => api.get('/agents/online'),
  get: (id: string) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: string, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: string) => api.delete(`/agents/${id}`),
  regenerateKey: (id: string) => api.post(`/agents/${id}/regenerate-key`),
};

// --- Tasks ---
export const tasksApi = {
  list: (params?: any) => api.get('/tasks', { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  updateStatus: (id: string, status: string) => api.put(`/tasks/${id}/status`, { status }),
  assignRole: (data: any) => api.post('/tasks/roles', data),
  removeRole: (taskId: string, agentId: string) => api.delete(`/tasks/${taskId}/roles/${agentId}`),
  getRoles: (taskId: string) => api.get(`/tasks/${taskId}/roles`),
  addTestResult: (data: any) => api.post('/tasks/tests', data),
  getTestReport: (taskId: string) => api.get(`/tasks/${taskId}/test-report`),
  getReport: (taskId: string) => api.get(`/tasks/${taskId}/report`),
};

// --- Messages ---
export const messagesApi = {
  byTask: (taskId: string, limit = 100) => api.get(`/messages/task/${taskId}?limit=${limit}`),
  byAgent: (agentId: string, limit = 100) => api.get(`/messages/agent/${agentId}?limit=${limit}`),
  all: (limit = 200) => api.get(`/messages?limit=${limit}`),
};

// --- Audit ---
export const auditApi = {
  byTask: (taskId: string) => api.get(`/audit/task/${taskId}`),
  byAgent: (agentId: string) => api.get(`/audit/agent/${agentId}`),
};

// --- Remote Connection ---
export const remoteApi = {
  listRemoteAgents: () => api.get('/remote/agents'),
  updateAgentConfig: (id: string, data: any) => api.put(`/remote/agents/${id}`, data),
  regenerateApiKey: (id: string) => api.post(`/agents/${id}/regenerate-key`),
  
  registerConnection: (agentId: string, apiKey: string, mode?: string) =>
    api.post('/remote/connect', { mode }, {
      headers: { 'X-Agent-ID': agentId, 'X-API-Key': apiKey },
    }),
  disconnect: (agentId: string, apiKey: string) =>
    api.post(`/remote/connect/${agentId}/disconnect`, { apiKey }),
  heartbeat: (agentId: string, apiKey: string) =>
    api.post(`/remote/connect/${agentId}/heartbeat`, null, {
      headers: { 'X-Agent-ID': agentId, 'X-API-Key': apiKey },
    }),
  
  relayMessage: (agentId: string, apiKey: string, data: any) =>
    api.post(`/remote/relay/${agentId}/message`, data, {
      headers: { 'X-Agent-ID': agentId, 'X-API-Key': apiKey },
    }),
  
  getStatus: () => api.get('/remote/status'),
  healthCheck: (agentId: string, apiKey: string) =>
    api.get(`/remote/health/${agentId}`, { params: { key: apiKey } }),
};

export default api;
