'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User, Workspace } from './api';

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, workspaceName?: string) => Promise<void>;
  logout: () => void;
  setActiveWorkspace: (workspace: Workspace) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = async () => {
    try {
      if (!api.getToken()) {
        setUser(null);
        setWorkspaces([]);
        setActiveWorkspaceState(null);
        setIsLoading(false);
        return;
      }
      const data = await api.getMe();
      setUser(data.user);
      setWorkspaces(data.workspaces || []);

      const savedWsId = api.getActiveWorkspaceId();
      const currentWs =
        (data.workspaces || []).find((w) => w.id === savedWsId) ||
        data.currentWorkspace ||
        data.workspaces?.[0] ||
        null;

      if (currentWs) {
        setActiveWorkspaceState(currentWs);
        api.setActiveWorkspaceId(currentWs.id);
      }
    } catch {
      setUser(null);
      setWorkspaces([]);
      setActiveWorkspaceState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      if (res.workspace) {
        setActiveWorkspaceState(res.workspace);
        setWorkspaces([res.workspace]);
      }
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, workspaceName?: string) => {
    setIsLoading(true);
    try {
      const res = await api.register({ name, email, password, workspaceName });
      setUser(res.user);
      if (res.workspace) {
        setActiveWorkspaceState(res.workspace);
        setWorkspaces([res.workspace]);
      }
      await refreshProfile();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearToken();
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };

  const setActiveWorkspace = (workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    api.setActiveWorkspaceId(workspace.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        isLoading,
        login,
        register,
        logout,
        setActiveWorkspace,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
