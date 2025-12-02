import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createWorkspace as apiCreateWorkspace, listWorkspaces } from './api';
import type { Workspace } from './types';

type WorkspaceContextValue = {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  setWorkspace: (id: string) => void;
  refresh: () => Promise<void>;
  addWorkspace: (name: string) => Promise<Workspace>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listWorkspaces();
      setWorkspaces(list);
      if (!list.length) {
        setCurrentWorkspaceId(null);
        return;
      }
      if (!currentWorkspaceId) {
        setCurrentWorkspaceId(list[0].id);
      } else if (currentWorkspaceId && !list.find((w) => w.id === currentWorkspaceId) && list.length) {
        setCurrentWorkspaceId(list[0].id);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setWorkspace = useCallback((id: string) => {
    setCurrentWorkspaceId(id);
  }, []);

  const addWorkspace = useCallback(
    async (name: string) => {
      const created = await apiCreateWorkspace({ name });
      await refresh();
      setCurrentWorkspaceId(created.id);
      return created;
    },
    [refresh],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      currentWorkspaceId,
      currentWorkspace: workspaces.find((w) => w.id === currentWorkspaceId) ?? null,
      loading,
      error,
      setWorkspace,
      refresh,
      addWorkspace,
    }),
    [workspaces, currentWorkspaceId, loading, error, setWorkspace, refresh, addWorkspace],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
