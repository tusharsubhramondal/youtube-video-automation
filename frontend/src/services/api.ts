import axios from 'axios';
import {
  VideoProject,
  VideoScene,
  AgentExecution,
  GeneratedAsset,
  VideoRender,
  YouTubeAccount,
  PublishedVideo,
  AIProviderConfig,
  ProjectSettings,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const projectService = {
  getProjects: async (): Promise<VideoProject[]> => {
    const res = await api.get('/projects');
    return res.data.data;
  },
  getProjectSummaryStats: async () => {
    const res = await api.get('/projects/stats/summary');
    return res.data.data;
  },
  getProjectById: async (id: string): Promise<VideoProject> => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data;
  },
  createProject: async (data: Partial<VideoProject>): Promise<VideoProject> => {
    const res = await api.post('/projects', data);
    return res.data.data;
  },
  updateProject: async (id: string, data: Partial<VideoProject>): Promise<VideoProject> => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data.data;
  },
  deleteProject: async (id: string) => {
    const res = await api.delete(`/projects/${id}`);
    return res.data;
  },
};

export const sceneService = {
  createScene: async (projectId: string, data: Partial<VideoScene>): Promise<VideoScene> => {
    const res = await api.post(`/scenes/project/${projectId}`, data);
    return res.data.data;
  },
  updateScene: async (id: string, data: Partial<VideoScene>): Promise<VideoScene> => {
    const res = await api.put(`/scenes/${id}`, data);
    return res.data.data;
  },
  deleteScene: async (id: string) => {
    const res = await api.delete(`/scenes/${id}`);
    return res.data;
  },
  reorderScenes: async (items: { id: string; sceneNumber: number }[]) => {
    const res = await api.post('/scenes/reorder', { items });
    return res.data;
  },
};

export const agentService = {
  runPipeline: async (projectId: string, startFromStage?: string) => {
    const res = await api.post(`/agents/pipeline/${projectId}`, { startFromStage });
    return res.data;
  },
  runAgent: async (agentType: string, projectId: string, payload?: any) => {
    const res = await api.post(`/agents/run/${agentType}/${projectId}`, payload);
    return res.data;
  },
  getAgentHistory: async (projectId: string): Promise<AgentExecution[]> => {
    const res = await api.get(`/agents/history/${projectId}`);
    return res.data.data;
  },
};

export const assetService = {
  getAssets: async (projectId: string): Promise<GeneratedAsset[]> => {
    const res = await api.get(`/assets/project/${projectId}`);
    return res.data.data;
  },
  uploadAsset: async (projectId: string, formData: FormData): Promise<GeneratedAsset> => {
    const res = await api.post(`/assets/upload/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },
  deleteAsset: async (id: string) => {
    const res = await api.delete(`/assets/${id}`);
    return res.data;
  },
};

export const renderService = {
  triggerRender: async (projectId: string, options?: any): Promise<VideoRender> => {
    const res = await api.post(`/renders/start/${projectId}`, options);
    return res.data.data;
  },
  getRenderStatus: async (renderId: string): Promise<VideoRender> => {
    const res = await api.get(`/renders/status/${renderId}`);
    return res.data.data;
  },
  getSubtitles: async (projectId: string): Promise<GeneratedAsset> => {
    const res = await api.get(`/renders/subtitles/${projectId}`);
    return res.data.data;
  },
};

export const youtubeService = {
  getAccounts: async (): Promise<{ accounts: YouTubeAccount[]; isConfigured: boolean }> => {
    const res = await api.get('/youtube/accounts');
    return { accounts: res.data.data, isConfigured: res.data.isConfigured };
  },
  getAuthUrl: async (): Promise<string> => {
    const res = await api.get('/youtube/auth-url');
    return res.data.authUrl;
  },
  connectMockChannel: async (): Promise<YouTubeAccount> => {
    const res = await api.post('/youtube/connect-mock');
    return res.data.data;
  },
  disconnectAccount: async (id: string) => {
    const res = await api.delete(`/youtube/account/${id}`);
    return res.data;
  },
  publishVideo: async (projectId: string, payload: {
    youtubeAccountId?: string;
    title: string;
    description: string;
    tags?: string;
    categoryId?: string;
    privacyStatus: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
    userApproved: boolean;
  }): Promise<PublishedVideo> => {
    const res = await api.post(`/youtube/publish/${projectId}`, payload);
    return res.data.data;
  },
};

export const settingsService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data.data;
  },
  saveProvider: async (data: Partial<AIProviderConfig>) => {
    const res = await api.post('/settings/providers', data);
    return res.data.data;
  },
  saveProjectSettings: async (projectId: string, data: Partial<ProjectSettings>) => {
    const res = await api.put(`/settings/project/${projectId}`, data);
    return res.data.data;
  },
};

export default api;

