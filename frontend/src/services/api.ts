import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Перехватчик для добавления токена
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Перехватчик для обработки ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authService = {
  setToken: (token: string | null) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete apiClient.defaults.headers.common['Authorization']
    }
  },
  login: async (username: string, password: string) => {
    const response = await apiClient.post('/auth/login', { username, password })
    return response.data
  },
  validate: async () => {
    const response = await apiClient.post('/auth/validate')
    return response.data
  },
}

export const usersService = {
  getAll: () => apiClient.get('/users'),
  getById: (id: number) => apiClient.get(`/users/${id}`),
  create: (data: any) => apiClient.post('/users', data),
  update: (id: number, data: any) => apiClient.patch(`/users/${id}`, data),
  changePassword: (id: number, password: string) =>
    apiClient.patch(`/users/${id}/password`, { password }),
  block: (id: number) => apiClient.post(`/users/${id}/block`),
  unblock: (id: number) => apiClient.post(`/users/${id}/unblock`),
  delete: (id: number) => apiClient.delete(`/users/${id}`),
}

export const pcsService = {
  getAll: () => apiClient.get('/pcs'),
  getById: (id: number) => apiClient.get(`/pcs/${id}`),
  create: (data: any) => apiClient.post('/pcs', data),
  update: (id: number, data: any) => apiClient.patch(`/pcs/${id}`, data),
  delete: (id: number) => apiClient.delete(`/pcs/${id}`),
}

export const groupsService = {
  getAll: () => apiClient.get('/groups'),
  getById: (id: number) => apiClient.get(`/groups/${id}`),
  create: (data: any) => apiClient.post('/groups', data),
  update: (id: number, data: any) => apiClient.patch(`/groups/${id}`, data),
  delete: (id: number) => apiClient.delete(`/groups/${id}`),
}

export const distributionsService = {
  getAll: () => apiClient.get('/distributions'),
  getById: (id: number) => apiClient.get(`/distributions/${id}`),
  upload: (file: File, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }
    return apiClient.post('/distributions/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  delete: (id: number) => apiClient.delete(`/distributions/${id}`),
}

export const tasksService = {
  getAll: () => apiClient.get('/tasks'),
  getById: (id: number) => apiClient.get(`/tasks/${id}`),
  getStatus: (id: number) => apiClient.get(`/tasks/${id}/status`),
  create: (data: any) => apiClient.post('/tasks', data),
  delete: (id: number) => apiClient.delete(`/tasks/${id}`),
}

export const agentsService = {
  getStatus: () => apiClient.get('/agent/status'),
  downloadInstallScript: (pcId: number, serverUrl?: string) => {
    const params = serverUrl ? { serverUrl } : {};
    return apiClient.get(`/agent/install-script/${pcId}`, {
      params,
      responseType: 'blob',
    });
  },
  downloadAgentExe: () => {
    return apiClient.get('/agent/download-exe', {
      responseType: 'blob',
    });
  },
  downloadInstaller: () => {
    return apiClient.get('/agent/download-installer', {
      responseType: 'blob',
    });
  },
  deleteAgent: (agentId: string) => apiClient.delete(`/agent/${agentId}`),
}

export const reportsService = {
  getDashboardStats: () => apiClient.get('/reports/dashboard'),
  getTaskStatistics: (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get('/reports/tasks', { params });
  },
  getPcStatistics: () => apiClient.get('/reports/pcs'),
  getTaskHistory: (limit?: number) => {
    const params = limit ? { limit } : {};
    return apiClient.get('/reports/tasks/history', { params });
  },
  getDistributionStatistics: () => apiClient.get('/reports/distributions'),
}

export default apiClient


