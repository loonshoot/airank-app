import { createContext, useContext, useState, useEffect } from 'react';

const WORKSPACE_STORAGE_KEY = 'airank_selected_workspace';

const initialState = {
  setWorkspace: () => {},
  workspace: null,
};

const WorkspaceContext = createContext(initialState);

export const useWorkspace = () => useContext(WorkspaceContext);

const WorkspaceProvider = ({ children }) => {
  const [workspace, setWorkspaceState] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load workspace from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (stored) {
          const parsedWorkspace = JSON.parse(stored);
          setWorkspaceState(parsedWorkspace);
        }
      } catch (e) {
        console.error('Failed to load workspace from storage:', e);
      }
      setIsInitialized(true);
    }
  }, []);

  const setWorkspace = (newWorkspace) => {
    setWorkspaceState(newWorkspace);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        if (newWorkspace) {
          localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(newWorkspace));
        } else {
          localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        }
      } catch (e) {
        console.error('Failed to save workspace to storage:', e);
      }
    }
  };

  return (
    <WorkspaceContext.Provider value={{ setWorkspace, workspace, isInitialized }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export default WorkspaceProvider;
