import axios from 'axios';

export type Platform = {
  platform: string;
  mode: string;
  screenshot?: number;
};

export type TaskSummary = {
  task_id: string;
  status: string;
  prompts_json: string;
  platforms_json: string;
  region_code_json: string;
  callback_url: string | null;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_local_at: string;
  updated_at: string;
};

export type Subtask = {
  subtask_id: string;
  task_id?: string;
  platform: string | null;
  mode: string | null;
  prompt: string | null;
  status: string | null;
  time?: string | null;
  page_screenshot: string | null;
  answer_content: string | null;
  error_message: string | null;
  reference_list_json?: string | null;
  citation_list_json?: string | null;
  reasoning_process_json?: string | null;
  recommended_questions_json?: string | null;
  media_content_json?: string | null;
  proxy_ip?: string | null;
  raw_result_json?: string | null;
  updated_at: string;
};

export type TaskDetail = TaskSummary & {
  prompts_json: string;
  platforms_json: string;
  region_code_json: string;
  raw_response_json: string;
  subTaskList: Subtask[];
  callbackEvents: Array<{
    id: number;
    task_id?: string;
    payload_json?: string;
    process_status: string;
    payload_hash: string;
    error_message?: string | null;
    received_at: string;
    processed_at: string | null;
  }>;
};

export type PageResult<T> = {
  page: number;
  size: number;
  total: number;
  items: T[];
};

export type Settings = {
  apiKey: {
    configured: boolean;
    masked: string | null;
    last4: string | null;
  };
  security?: {
    apiKeyUpdateAllowed: boolean;
  };
};

export type CityOption = {
  province: string;
  regionCode: string[];
};

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  role: string;
};

export type LoginResult = {
  token: string;
  expiresAt: string;
  user: AuthUser;
};

const AUTH_TOKEN_KEY = 'molizhishu_auth_token';
const AUTH_USER_KEY = 'molizhishu_auth_user';

const http = axios.create({
  baseURL: '/',
  timeout: 30000
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message;
    if (error.response?.status === 401) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.href = '/login';
      }
    }
    if (message) {
      throw new Error(message);
    }
    throw error;
  }
);

function unwrap<T>(response: { data: { success: boolean; data: T; message?: string } }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || '请求失败');
  }
  return response.data.data;
}

export function saveAuth(result: LoginResult) {
  localStorage.setItem(AUTH_TOKEN_KEY, result.token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
}

export function saveStoredUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function hasAuthToken() {
  return Boolean(localStorage.getItem(AUTH_TOKEN_KEY));
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const api = {
  async login(payload: { username: string; password: string }) {
    return unwrap<LoginResult>(await http.post('/api/auth/login', payload));
  },
  async me() {
    return unwrap<AuthUser>(await http.get('/api/auth/me'));
  },
  async logout() {
    return unwrap<boolean>(await http.post('/api/auth/logout'));
  },
  async listTasks(params: { page: number; size: number; status?: string }) {
    return unwrap<PageResult<TaskSummary>>(await http.get('/api/tasks', { params }));
  },
  async createTask(payload: {
    monitorKeywords?: string;
    prompts: string[];
    platforms: Platform[];
    regionCode?: string[];
    callbackUrl?: string;
  }) {
    return unwrap(await http.post('/api/tasks', payload));
  },
  async getTask(taskId: string) {
    return unwrap<TaskDetail>(await http.get(`/api/tasks/${taskId}`));
  },
  async syncTask(taskId: string) {
    return unwrap(await http.post(`/api/tasks/${taskId}/sync`));
  },
  async stopTask(taskId: string) {
    return unwrap(await http.put(`/api/tasks/${taskId}/stop`));
  },
  async getCallbackUrl() {
    return unwrap<string | null>(await http.get('/api/callback-url'));
  },
  async updateCallbackUrl(callbackUrl: string | null) {
    return unwrap<string | null>(await http.put('/api/callback-url', { callbackUrl }));
  },
  async getSettings() {
    return unwrap<Settings>(await http.get('/api/settings'));
  },
  async updateApiKey(apiKey: string) {
    return unwrap<Settings>(await http.put('/api/settings/api-key', { apiKey }));
  },
  async getCities() {
    return unwrap<CityOption[]>(await http.get('/api/cities'));
  }
};
