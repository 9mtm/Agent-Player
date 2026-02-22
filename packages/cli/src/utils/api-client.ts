/**
 * API Client
 *
 * Communicates with Agent Player backend
 */

import axios, { AxiosInstance } from 'axios';

export class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Check if backend is running
   */
  async isBackendRunning(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'ok';
    } catch (err) {
      return false;
    }
  }

  /**
   * Get backend status
   */
  async getStatus(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Skills API
   */
  async getSkills(): Promise<any[]> {
    const response = await this.client.get('/api/skills');
    return response.data.skills || [];
  }

  async installSkill(name: string): Promise<any> {
    const response = await this.client.post('/api/skills/install', { name });
    return response.data;
  }

  async removeSkill(id: string): Promise<any> {
    const response = await this.client.delete(`/api/skills/${id}`);
    return response.data;
  }

  async updateSkill(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/api/skills/${id}`, data);
    return response.data;
  }

  /**
   * Channels API
   */
  async getChannels(): Promise<any[]> {
    const response = await this.client.get('/api/channels');
    return response.data.channels || [];
  }

  async connectChannel(id: string): Promise<any> {
    const response = await this.client.post(`/api/channels/${id}/connect`);
    return response.data;
  }

  async disconnectChannel(id: string): Promise<any> {
    const response = await this.client.post(`/api/channels/${id}/disconnect`);
    return response.data;
  }

  /**
   * Jobs API
   */
  async getJobs(): Promise<any[]> {
    const response = await this.client.get('/api/scheduler/jobs');
    return response.data.jobs || [];
  }

  async createJob(data: any): Promise<any> {
    const response = await this.client.post('/api/scheduler/jobs', data);
    return response.data;
  }

  async runJob(id: string): Promise<any> {
    const response = await this.client.post(`/api/scheduler/jobs/${id}/execute`);
    return response.data;
  }

  async deleteJob(id: string): Promise<any> {
    const response = await this.client.delete(`/api/scheduler/jobs/${id}`);
    return response.data;
  }

  /**
   * Chat API
   */
  async sendMessage(message: string, sessionId?: string): Promise<any> {
    const response = await this.client.post('/api/chat', {
      message,
      sessionId: sessionId || 'cli-session'
    });
    return response.data;
  }

  /**
   * Onboarding API
   */
  async startOnboarding(): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/onboarding/start');
    return response.data;
  }

  async getOnboardingStatus(): Promise<any> {
    const response = await this.client.get('/api/onboarding/status');
    return response.data;
  }

  async resumeOnboarding(): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/onboarding/resume');
    return response.data;
  }

  async skipOnboarding(): Promise<{ success: boolean }> {
    const response = await this.client.post('/api/onboarding/skip');
    return response.data;
  }
}

// Singleton instance
let apiClient: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!apiClient) {
    apiClient = new ApiClient();
  }
  return apiClient;
}
