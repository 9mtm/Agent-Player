import api from "./api";

// ✅ Chat Statistics Service - ALL CODE IN ENGLISH
export interface ChatStatistics {
  total_conversations: number;
  active_conversations: number;
  archived_conversations: number;
  total_messages: number;
  messages_today: number;
  messages_this_week: number;
  messages_this_month: number;
  most_active_hour: number;
  most_active_day: string;
  average_conversation_length: number;
  longest_conversation: {
    id: string;
    title: string;
    message_count: number;
  };
  favorite_agents: Array<{
    agent_id: number;
    agent_name: string;
    usage_count: number;
  }>;
  conversation_trends: Array<{
    date: string;
    count: number;
  }>;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'txt' | 'pdf';
  include_metadata: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  conversation_ids?: string[];
}

class ChatStatsService {
  // Get comprehensive chat statistics - ALL CODE IN ENGLISH
  async getChatStatistics(): Promise<ChatStatistics> {
    try {
      const response = await api.get('/chat/analytics/dashboard');
      return response.data.data || this.getDefaultStats();
    } catch (error) {
      console.error('Error fetching chat statistics:', error);
      return this.getDefaultStats();
    }
  }

  // Export conversations with options - ALL CODE IN ENGLISH
  async exportConversations(
    conversationIds: string[],
    options: ExportOptions = { format: 'json', include_metadata: true }
  ): Promise<Blob> {
    try {
      const response = await api.post('/chat/conversations/export', {
        conversation_ids: conversationIds,
        ...options
      }, {
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exporting conversations:', error);
      throw new Error('Failed to export conversations');
    }
  }

  // Export single conversation - ALL CODE IN ENGLISH
  async exportSingleConversation(
    conversationId: string,
    format: 'json' | 'txt' | 'pdf' = 'json'
  ): Promise<Blob> {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/export`, {
        params: { format },
        responseType: 'blob'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw new Error('Failed to export conversation');
    }
  }

  // Archive conversations - ALL CODE IN ENGLISH
  async archiveConversations(conversationIds: string[]): Promise<void> {
    try {
      await api.post('/chat/conversations/archive', {
        conversation_ids: conversationIds
      });
    } catch (error) {
      console.error('Error archiving conversations:', error);
      throw new Error('Failed to archive conversations');
    }
  }

  // Restore archived conversations - ALL CODE IN ENGLISH
  async restoreConversations(conversationIds: string[]): Promise<void> {
    try {
      await api.post('/chat/conversations/restore', {
        conversation_ids: conversationIds
      });
    } catch (error) {
      console.error('Error restoring conversations:', error);
      throw new Error('Failed to restore conversations');
    }
  }

  // Bulk delete conversations - ALL CODE IN ENGLISH
  async deleteConversations(conversationIds: string[]): Promise<void> {
    try {
      await api.post('/chat/conversations/bulk-delete', {
        conversation_ids: conversationIds
      });
    } catch (error) {
      console.error('Error deleting conversations:', error);
      throw new Error('Failed to delete conversations');
    }
  }

  // Get conversation analytics - ALL CODE IN ENGLISH
  async getConversationAnalytics(conversationId: string): Promise<any> {
    try {
      const response = await api.get(`/chat/conversations/${conversationId}/analytics`);
      return response.data.data || {};
    } catch (error) {
      console.error('Error fetching conversation analytics:', error);
      return {};
    }
  }

  // Search conversations with advanced filters - ALL CODE IN ENGLISH
  async searchConversations(params: {
    query?: string;
    agent_id?: number;
    date_from?: string;
    date_to?: string;
    message_count_min?: number;
    message_count_max?: number;
    is_archived?: boolean;
  }): Promise<any[]> {
    try {
      const response = await api.get('/chat/search/advanced', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Error searching conversations:', error);
      return [];
    }
  }

  // Generate chat summary report - ALL CODE IN ENGLISH
  async generateSummaryReport(
    dateRange: { start: string; end: string }
  ): Promise<any> {
    try {
      const response = await api.post('/chat/analytics/summary-report', dateRange);
      return response.data.data || {};
    } catch (error) {
      console.error('Error generating summary report:', error);
      return {};
    }
  }

  // Download file helper - ALL CODE IN ENGLISH
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Get default statistics when API fails - ALL CODE IN ENGLISH
  private getDefaultStats(): ChatStatistics {
    return {
      total_conversations: 0,
      active_conversations: 0,
      archived_conversations: 0,
      total_messages: 0,
      messages_today: 0,
      messages_this_week: 0,
      messages_this_month: 0,
      most_active_hour: 14,
      most_active_day: 'Monday',
      average_conversation_length: 0,
      longest_conversation: {
        id: '',
        title: 'No conversations yet',
        message_count: 0
      },
      favorite_agents: [],
      conversation_trends: []
    };
  }

  // Format filename for export - ALL CODE IN ENGLISH
  formatExportFilename(type: string, format: string): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    return `dpro-chat-${type}-${timestamp}.${format}`;
  }
}

export default new ChatStatsService(); 