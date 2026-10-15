// BotNexa API Client with Token Management and Automatic Proxy Routing

const API_BASE = '/botnexa-api';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: string;
  currentWorkspaceId?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role?: string;
  createdAt: string;
}

export interface Assistant {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  instructions: string;
  model: string;
  temperature: number;
  maxTokens: number;
  status: 'draft' | 'published' | 'archived';
  isPublic: boolean;
  avatarUrl?: string;
  contexts?: ContextSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface ContextSummary {
  id: string;
  name: string;
  description?: string;
  sourceType: 'text' | 'document' | 'url' | 'structured';
  totalChunks: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface ContextChunk {
  id: string;
  contextId: string;
  chunkIndex: number;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Wallet {
  id: string;
  workspaceId: string;
  currency: string;
  balance: number; // minor units (cents / paise)
  reservedAmount: number;
  lifetimeSpent: number;
  status: 'active' | 'frozen' | 'suspended';
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'credit' | 'debit' | 'reservation' | 'settlement' | 'refund';
  amount: number;
  openingBalance?: number;
  balanceAfter: number;
  closingBalance?: number;
  reason: string;
  status: 'succeeded' | 'pending' | 'failed';
  createdAt: string;
}

export interface ApiKeyItem {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string;
  status: 'active' | 'revoked';
  rateLimitPerMinute: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostMinor: number;
  totalQueries: number;
  activeAssistants: number;
  knowledgeBases: number;
  apiKeysCount: number;
  currency: string;
}

export interface UsageChartDataPoint {
  date: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  queries: number;
  costMinor: number;
}

export interface AuditLogItem {
  id: string;
  workspaceId: string;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    costInCents?: number;
    sources?: Array<{ contextId: string; title: string; chunkSnippet: string; score: number }>;
  };
  createdAt?: string;
}

export interface ChatResponse {
  conversationId: string;
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostMinor: number;
  };
  citations?: Array<{
    chunkId: string;
    snippet: string;
    similarity: number;
    contextId: string;
  }>;
}

class ApiClient {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('botnexa_token');
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
  }

  setToken(token: string | undefined | null) {
    if (typeof window !== 'undefined') {
      if (token && token !== 'undefined' && token !== 'null') {
        localStorage.setItem('botnexa_token', token);
      } else {
        localStorage.removeItem('botnexa_token');
      }
    }
  }

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('botnexa_token');
      localStorage.removeItem('botnexa_user');
      localStorage.removeItem('botnexa_active_workspace');
    }
  }

  getActiveWorkspaceId(): string | null {
    if (typeof window === 'undefined') return null;
    const wsId = localStorage.getItem('botnexa_active_workspace');
    if (!wsId || wsId === 'undefined' || wsId === 'null') return null;
    return wsId;
  }

  setActiveWorkspaceId(id: string | undefined | null) {
    if (typeof window !== 'undefined') {
      if (id && id !== 'undefined' && id !== 'null') {
        localStorage.setItem('botnexa_active_workspace', id);
      } else {
        localStorage.removeItem('botnexa_active_workspace');
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth') && !window.location.pathname.startsWith('/chat/')) {
      this.clearToken();
      window.location.href = '/auth/login';
      throw new Error('Unauthorized');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data as T;
  }

  // Auth endpoints
  async login(body: { email: string; password: string }) {
    const data = await this.request<{ token?: string; accessToken?: string; user: User; workspace: Workspace }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const jwt = data.token || data.accessToken;
    if (jwt) {
      this.setToken(jwt);
    }
    if (data.workspace?.id) {
      this.setActiveWorkspaceId(data.workspace.id);
    }
    return data;
  }

  async register(body: { name: string; email: string; password: string; workspaceName?: string }) {
    const data = await this.request<{ token?: string; accessToken?: string; user: User; workspace: Workspace }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const jwt = data.token || data.accessToken;
    if (jwt) {
      this.setToken(jwt);
    }
    if (data.workspace?.id) {
      this.setActiveWorkspaceId(data.workspace.id);
    }
    return data;
  }

  async getMe() {
    return this.request<{ user: User; workspaces: Workspace[]; currentWorkspace: Workspace }>('/auth/me');
  }

  // Workspaces
  async listWorkspaces() {
    return this.request<Workspace[]>('/workspaces');
  }

  async createWorkspace(body: { name: string }) {
    return this.request<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateWorkspace(body: { name?: string; description?: string }) {
    return this.request<Workspace>('/workspaces/current', {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  // Assistants
  async listAssistants(workspaceId?: string) {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    return this.request<Assistant[]>(`/assistants${query}`);
  }

  async getAssistant(id: string) {
    return this.request<Assistant>(`/assistants/${id}`);
  }

  async createAssistant(body: {
    workspaceId?: string;
    name: string;
    description?: string;
    instructions: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    contextIds?: string[];
    isPublic?: boolean;
  }) {
    const payload = {
      ...body,
      workspaceId: body.workspaceId || this.getActiveWorkspaceId(),
    };
    return this.request<Assistant>('/assistants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAssistant(id: string, body: Partial<Assistant> & { contextIds?: string[] }) {
    return this.request<Assistant>(`/assistants/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async deleteAssistant(id: string) {
    return this.request<{ success: boolean }>(`/assistants/${id}`, {
      method: 'DELETE',
    });
  }

  // Contexts (Knowledge Base)
  async listContexts(workspaceId?: string) {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    return this.request<ContextSummary[]>(`/contexts${query}`);
  }

  async createContext(body: {
    workspaceId?: string;
    name: string;
    description?: string;
    rawText: string;
    sourceType?: 'text' | 'document' | 'url';
  }) {
    const payload = {
      ...body,
      rawContent: body.rawText,
      rawText: body.rawText,
      type: (body.sourceType || 'text').toUpperCase(),
      workspaceId: body.workspaceId || this.getActiveWorkspaceId(),
    };
    return this.request<ContextSummary>('/contexts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getContextChunks(contextId: string) {
    return this.request<ContextChunk[]>(`/contexts/${contextId}/chunks`);
  }

  async createChunk(contextId: string, content: string): Promise<ContextChunk> {
    return this.request<ContextChunk>(`/contexts/${contextId}/chunks`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateChunk(contextId: string, chunkId: string, content: string): Promise<ContextChunk> {
    return this.request<ContextChunk>(`/contexts/${contextId}/chunks/${chunkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  }

  async deleteChunk(contextId: string, chunkId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/contexts/${contextId}/chunks/${chunkId}`, {
      method: 'DELETE',
    });
  }

  async deleteContext(id: string) {
    return this.request<{ success: boolean }>(`/contexts/${id}`, {
      method: 'DELETE',
    });
  }

  // Chat
  async sendChatMessage(body: {
    assistantId: string;
    conversationId?: string;
    message: string;
  }): Promise<ChatResponse> {
    const res = await this.request<any>('/chat/message', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const content = res?.message?.content || res?.reply || '';
    const msgId = res?.message?.id || res?.messageId || `msg-${Date.now()}`;
    const citations = res?.citations || (res?.sources || []).map((s: any) => ({
      chunkId: s.chunkId,
      snippet: s.content,
      similarity: s.similarity,
      contextId: s.contextId,
    }));
    const totalTokens = Number(res?.usage?.totalTokens || 0);
    const estimatedCostMinor = Number(
      res?.usage?.estimatedCostMinor ??
      res?.usage?.customerChargeMinorUnits ??
      (totalTokens > 0 ? Math.max(1, Math.ceil(totalTokens * 0.0001)) : 1)
    );

    if (res?.wallet && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('botnexa:wallet-updated', {
          detail: {
            wallet: {
              balance: res.wallet.balance,
              reservedAmount: res.wallet.reservedAmount ?? 0,
            },
          },
        })
      );
    }

    return {
      conversationId: res?.conversationId,
      message: {
        id: msgId,
        role: 'assistant',
        content,
        createdAt: res?.message?.createdAt || new Date().toISOString(),
      },
      usage: res?.usage
        ? {
            ...res.usage,
            totalTokens: totalTokens || (Number(res.usage.inputTokens || 0) + Number(res.usage.outputTokens || 0)),
            estimatedCostMinor,
          }
        : undefined,
      citations,
    };
  }

  async getConversations(assistantId: string) {
    return this.request<Array<{ id: string; title: string; createdAt: string; updatedAt: string }>>(
      `/chat/conversations?assistantId=${encodeURIComponent(assistantId)}`
    );
  }

  async getConversationMessages(conversationId: string) {
    return this.request<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
  }

  async updateConversation(conversationId: string, title: string) {
    return this.request<{ id: string; title: string }>(`/chat/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(conversationId: string) {
    return this.request<{ success: boolean; message: string }>(`/chat/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async clearConversationMessages(conversationId: string) {
    return this.request<{ success: boolean; message: string }>(`/chat/conversations/${conversationId}/messages`, {
      method: 'DELETE',
    });
  }

  async exportConversation(conversationId: string) {
    return this.request<{
      conversation: { id: string; title: string; createdAt: string; updatedAt: string };
      totalMessages: number;
      messages: any[];
      exportedAt: string;
    }>(`/chat/conversations/${conversationId}/export`);
  }

  // Public Chat Link
  async getChatLinkForAssistant(assistantId: string) {
    return this.request<{ slug: string; isPublic: boolean; url: string; fullUrl?: string }>(
      `/chat-links/assistant/${assistantId}`
    );
  }

  async createChatLink(body: { assistantId: string; isPublic: boolean }) {
    return this.request<{ slug: string; isPublic: boolean; url: string }>('/chat-links', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async sendPublicChatMessage(slug: string, body: { message: string; conversationId?: string; token?: string }): Promise<ChatResponse> {
    const cleanSlug = encodeURIComponent(decodeURIComponent(slug || '').trim().replace(/\s+/g, '-'));
    const res = await this.request<any>(`/chat-links/public/${cleanSlug}/message`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const content = res?.message?.content || res?.reply || '';
    const msgId = res?.message?.id || res?.messageId || `asst-${Date.now()}`;
    const citations = res?.citations || (res?.sources || []).map((s: any) => ({
      chunkId: s.chunkId,
      snippet: s.content,
      similarity: s.similarity,
      contextId: s.contextId,
    }));
    return {
      conversationId: res?.conversationId,
      message: {
        id: msgId,
        role: 'assistant',
        content,
        createdAt: res?.message?.createdAt || new Date().toISOString(),
      },
      usage: res?.usage,
      citations,
    };
  }

  async getPublicAssistantInfo(slug: string, token?: string) {
    const cleanSlug = encodeURIComponent(decodeURIComponent(slug || '').trim().replace(/\s+/g, '-'));
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    const res = await this.request<any>(`/chat-links/public/${cleanSlug}${query}`);
    const asst = res?.assistant || res || {};
    return {
      chatLinkId: res?.chatLinkId,
      slug: res?.slug,
      mode: res?.mode || 'PUBLIC',
      isPublic: Boolean(res?.isPublic),
      isProtected: Boolean(res?.isProtected),
      isPrivate: Boolean(res?.isPrivate),
      requiresAuth: Boolean(res?.requiresAuth),
      requiresToken: Boolean(res?.requiresToken),
      userPermission: (res?.userPermission || 'none') as 'chat' | 'view' | 'none',
      authenticatedUser: res?.authenticatedUser || null,
      name: asst.name || res?.name || 'BotNexa Assistant',
      description: asst.description || res?.description || '',
      avatarUrl: asst.avatarUrl || res?.avatarUrl,
      welcomeMessage: asst.welcomeMessage || res?.welcomeMessage || 'Hello! How can I help you today?',
    };
  }

  // Wallet
  async getWallet(workspaceId?: string): Promise<Wallet> {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    const res = await this.request<any>(`/wallet${query}`);
    const rawBal = Number(res?.balance ?? res?.totalBalanceMinorUnits ?? 0);
    const rawRes = Number(res?.reservedAmount ?? res?.reservedAmountMinorUnits ?? 0);
    const rawLft = Number(res?.lifetimeSpent ?? 0);
    return {
      id: res?.id || 'wlt-default',
      workspaceId: res?.workspaceId || (wsId || 'default-ws'),
      currency: res?.currency || 'INR',
      balance: isNaN(rawBal) ? 0 : rawBal,
      reservedAmount: isNaN(rawRes) ? 0 : rawRes,
      lifetimeSpent: isNaN(rawLft) ? 0 : rawLft,
      status: (res?.status || 'active').toLowerCase(),
    };
  }

  async topUpWallet(body: { amountMinor?: number; amountMinorUnits?: number; workspaceId?: string }) {
    const amount = Number(body.amountMinorUnits || body.amountMinor || 5000);
    const targetWsId = body.workspaceId || this.getActiveWorkspaceId() || undefined;
    const payload = {
      amountMinorUnits: amount,
      amountMinor: amount,
      referenceId: `topup-${Date.now()}`,
      workspaceId: targetWsId,
    };
    await this.request<any>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const updated = await this.getWallet(targetWsId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('botnexa:wallet-updated', {
          detail: { wallet: updated },
        })
      );
    }
    return updated;
  }

  async getTransactions(workspaceId?: string): Promise<WalletTransaction[]> {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    const res = await this.request<any[]>(`/wallet/transactions${query}`);
    if (!Array.isArray(res)) return [];
    return res.map((t) => ({
      id: t.id || `tx-${Date.now()}`,
      walletId: t.walletId || '',
      type: (t.type || 'credit').toLowerCase(),
      amount: Number(t.amount || t.amountMinorUnits || 0),
      openingBalance: Number(t.openingBalance ?? 0),
      balanceAfter: Number(t.balanceAfter ?? t.closingBalance ?? t.metadata?.balanceAfter ?? 0),
      closingBalance: Number(t.closingBalance ?? t.balanceAfter ?? t.metadata?.balanceAfter ?? 0),
      reason: t.reason || t.metadata?.description || t.metadata?.reason || t.referenceId || 'Transaction',
      status: (t.status || 'succeeded').toLowerCase(),
      createdAt: t.createdAt || new Date().toISOString(),
    }));
  }

  // API Keys
  async listApiKeys(workspaceId?: string) {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    return this.request<ApiKeyItem[]>(`/api-keys${query}`);
  }

  async createApiKey(body: { name: string; workspaceId?: string }) {
    const payload = {
      ...body,
      workspaceId: body.workspaceId || this.getActiveWorkspaceId(),
    };
    const res = await this.request<any>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      id: res.id,
      name: res.name,
      keyPrefix: res.keyPrefix || res.prefix || '',
      secretKey: res.secretKey || res.rawSecret || res.key || '',
      rawSecret: res.rawSecret || res.secretKey || res.key || '',
    };
  }

  async revokeApiKey(id: string) {
    return this.request<{ success: boolean }>(`/api-keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Embed Token
  async generateEmbedToken(body: {
    assistantId: string;
    expiresInSeconds?: number;
    allowedOrigins?: string[];
  }) {
    return this.request<{
      token: string;
      tokenType: string;
      assistantId: string;
      expiresInSeconds: number;
      expiresAt: string;
      allowedOrigins: string[];
    }>('/api-keys/embed-token', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        version: 'v1',
      }),
    });
  }

  // Chat Links Deletion
  async deleteChatLink(id: string) {
    return this.request<{ success: boolean; message: string }>(`/chat-links/${id}`, {
      method: 'DELETE',
    });
  }

  // Workspace Members Management
  async getWorkspaceMembers(): Promise<WorkspaceMember[]> {
    return this.request<WorkspaceMember[]>('/workspaces/current/members');
  }

  async addWorkspaceMember(body: { email: string; role: string }): Promise<WorkspaceMember> {
    return this.request<WorkspaceMember>('/workspaces/current/members', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateMemberRole(userId: string, role: string): Promise<WorkspaceMember> {
    return this.request<WorkspaceMember>(`/workspaces/current/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  async removeMember(userId: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/workspaces/current/members/${userId}`, {
      method: 'DELETE',
    });
  }

  // Analytics & Metrics
  async getAnalyticsOverview(workspaceId?: string): Promise<AnalyticsOverview> {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = wsId ? `?workspaceId=${encodeURIComponent(wsId)}` : '';
    return this.request<AnalyticsOverview>(`/analytics/overview${query}`);
  }

  async getAnalyticsChart(days: number = 14, workspaceId?: string): Promise<UsageChartDataPoint[]> {
    const wsId = workspaceId || this.getActiveWorkspaceId();
    const query = `?days=${days}${wsId ? `&workspaceId=${encodeURIComponent(wsId)}` : ''}`;
    return this.request<UsageChartDataPoint[]>(`/analytics/usage-chart${query}`);
  }

  // Enterprise Security Audit Trail
  async getAuditLogs(options?: {
    limit?: number;
    offset?: number;
    action?: string;
    resource?: string;
  }): Promise<{ items: AuditLogItem[]; total: number; limit: number; offset: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.action) params.set('action', options.action);
    if (options?.resource) params.set('resource', options.resource);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<{ items: AuditLogItem[]; total: number; limit: number; offset: number }>(`/audit-logs${query}`);
  }

  async getAuditActions(): Promise<string[]> {
    return this.request<string[]>('/audit-logs/actions');
  }

  async createAuditLog(body: {
    action: string;
    resource: string;
    resourceId?: string;
    details?: Record<string, any>;
  }): Promise<AuditLogItem> {
    return this.request<AuditLogItem>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Health
  async checkHealth() {
    return this.request<{ status: string; database: string; vectorExtension: string }>('/health/ready');
  }
}

export const api = new ApiClient();
