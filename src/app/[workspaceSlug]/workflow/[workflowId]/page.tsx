'use client';

import { useState, useEffect, use, useCallback } from 'react';
import toast from 'react-hot-toast';
import '../../../i18n'; // Import i18n initialization

import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { executeQuery, executeMutation } from '@/graphql/operations';
import { 
  GET_WORKFLOWS, 
  UPDATE_WORKFLOW, 
  DELETE_WORKFLOW
} from '@/graphql/workflow-operations';

// React Flow imports
import { 
  ReactFlowProvider,
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import LayoutFlow and Forms
import LayoutFlow from '@/components/Canvas/Layout/index';
import { getForm } from '@/components/Forms/index';

// Navigation icons
import {
  ArrowLeftIcon,
  Bars3Icon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';

// Workflow interfaces
interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: any
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  type?: string
  data?: any
}

interface WorkflowDefinition {
  id: string
  name: string
  description?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  triggers?: Array<{
    id: string
    type: string
    active: boolean
  }>
  tags?: string[]
  status?: string
  createdAt?: string
  updatedAt?: string
}

interface WorkflowPageProps {
  params: Promise<{
    workspaceSlug: string
    workflowId: string
  }>
}

// Workflow Navigation Component
const WorkflowNavigation = ({ 
  workflow, 
  workspace, 
  onBack, 
  showMainMenu, 
  onToggleMainMenu,
  onToggleStatus,
  onAddNode,
  onUpdateTitle
}: {
  workflow: WorkflowDefinition | null
  workspace: any
  onBack: () => void
  showMainMenu: boolean
  onToggleMainMenu: () => void
  onToggleStatus: () => void
  onAddNode: (nodeType: string) => void
  onUpdateTitle: (newTitle: string) => void
}) => {
  const { t } = useTranslation();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(workflow?.name || '');

  // Update edited title when workflow changes
  useEffect(() => {
    setEditedTitle(workflow?.name || '');
  }, [workflow?.name]);

  const handleTitleEdit = () => {
    setIsEditingTitle(true);
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== workflow?.name) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(workflow?.name || '');
    setIsEditingTitle(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

    return (
    <div className="w-80 bg-yellow-400 dark:bg-yellow-400 flex flex-col h-screen">
      {/* Logo Section (always visible) */}
      <div className="relative flex items-center justify-center p-3 bg-dark border-b border-b-dark">
        <Link href="/" className="flex-grow text-2xl font-bold">
          <Image
            src="/images/logo-light.svg"
            width={100}
            height={100}
            alt="AI Rank logo"
            priority
          />
        </Link>
      </div>

      {/* Header with back button only */}
      <div className="flex items-center p-5">
        <button
          onClick={onToggleMainMenu}
          className="flex items-center space-x-2 text-dark hover:text-gray-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          <span className="text-sm">{showMainMenu ? 'Back to action bar' : 'Back to menu'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showMainMenu ? (
                      /* Main Menu */
            <div className="p-5 space-y-3">
              {/* Workspace Section */}
              <div className="space-y-2">
                <h5 className="text-xl font-bold text-dark">Workspace</h5>
                <ul className="leading-10">
                  <li>
                    <a href="/" className="text-dark hover:text-dark">
                      {t("common.label.workspaces")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}`} className="text-dark hover:text-dark">
                      {t("common.label.home")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}/data`} className="text-dark hover:text-dark">
                      {t("common.label.data")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}/sources`} className="text-dark hover:text-dark">
                      {t("common.label.sources")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}/destinations`} className="text-dark hover:text-dark">
                      {t("common.label.destinations")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}/logs`} className="text-dark hover:text-dark">
                      {t("common.label.logs")}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Admin Section */}
              <div className="space-y-2">
                <h5 className="text-xl font-bold text-dark">Admin</h5>
                <ul className="leading-10">
                  <li>
                    <a href={`/${workspace?.slug}/settings/general`} className="text-dark hover:text-dark">
                      {t("settings.workspace.settings")}
                    </a>
                  </li>
                  <li>
                    <a href={`/${workspace?.slug}/settings/billing`} className="text-dark hover:text-dark">
                      {t("settings.workspace.billing")}
                    </a>
                  </li>
                </ul>
              </div>

              {/* User Section */}
              <div className="space-y-2">
                <h5 className="text-xl font-bold text-dark">User</h5>
                <ul className="leading-10">
                  <li>
                    <a href="/account/settings" className="text-dark hover:text-dark">
                      {t("common.label.account")}
                    </a>
                  </li>
                  <li>
                    <a 
                      onClick={() => {
                        const result = confirm('Are you sure you want to logout?');
                        if (result) {
                          // Import signOut dynamically or handle logout
                          window.location.href = '/auth/login';
                        }
                      }}
                      className="text-dark hover:text-dark cursor-pointer"
                    >
                      {t("common.label.logout")}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
        ) : (
          /* Workflow Actions Menu */
          <div className="p-5 space-y-3">
            {/* Workflow Title */}
            <div className="space-y-2">
              {isEditingTitle ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleTitleSave}
                    className="text-xl font-bold text-dark bg-transparent border-b border-dark focus:outline-none flex-1"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h5 className="text-xl font-bold text-dark truncate">{workflow?.name || 'Untitled Workflow'}</h5>
                  <button
                    onClick={handleTitleEdit}
                    className="text-gray-600 hover:text-dark transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark">Status:</span>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-dark">
                    {workflow?.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                  <label className="flex items-center cursor-pointer relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={workflow?.status === 'active'}
                      onChange={onToggleStatus}
                    />
                    <div className={`relative h-6 w-11 transition-colors duration-200 ${
                      workflow?.status === 'active' 
                        ? 'bg-pink-600' 
                        : 'bg-dark'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 border border-gray-300 transition-transform duration-200 ease-in-out ${
                        workflow?.status === 'active' ? 'translate-x-5' : 'translate-x-0'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Add Node Actions */}
            <div className="space-y-2">
              <h5 className="text-xl font-bold text-dark">Components</h5>
              
              {/* Common Components */}
              <div className="docs-section" data-section="common">
                <button 
                  className="docs-section-toggle w-full flex items-center justify-between text-left py-2 text-dark hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    const section = e.currentTarget.closest('.docs-section') as HTMLElement;
                    if (section) {
                      section.classList.toggle('expanded');
                      const subsection = section.querySelector('.docs-subsection') as HTMLElement;
                      const isExpanded = section.classList.contains('expanded');
                      if (subsection) {
                        if (isExpanded) {
                          subsection.style.maxHeight = subsection.scrollHeight + 'px';
                        } else {
                          subsection.style.maxHeight = '0px';
                        }
                      }
                    }
                  }}
                  aria-expanded="false"
                >
                  <span className="font-semibold">Common</span>
                  <svg className="docs-chevron w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                <div className="docs-subsection max-h-0 overflow-hidden transition-all duration-300">
                  <div className="pl-4 space-y-1 pt-2">
                    <a 
                      onClick={() => onAddNode('transformer')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      {t("workflow.component.transform.title")}
                    </a>
                    <a 
                      onClick={() => onAddNode('ifthenor')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      {t("workflow.component.ifthenor.title")}
                    </a>
                    <a 
                      onClick={() => onAddNode('parser')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      Parser
                    </a>
                  </div>
                </div>
              </div>

              {/* Data Components */}
              <div className="docs-section" data-section="data">
                <button 
                  className="docs-section-toggle w-full flex items-center justify-between text-left py-2 text-dark hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    const section = e.currentTarget.closest('.docs-section') as HTMLElement;
                    if (section) {
                      section.classList.toggle('expanded');
                      const subsection = section.querySelector('.docs-subsection') as HTMLElement;
                      const isExpanded = section.classList.contains('expanded');
                      if (subsection) {
                        if (isExpanded) {
                          subsection.style.maxHeight = subsection.scrollHeight + 'px';
                        } else {
                          subsection.style.maxHeight = '0px';
                        }
                      }
                    }
                  }}
                  aria-expanded="false"
                >
                  <span className="font-semibold">Data</span>
                  <svg className="docs-chevron w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                <div className="docs-subsection max-h-0 overflow-hidden transition-all duration-300">
                  <div className="pl-4 space-y-1 pt-2">
                    <a 
                      onClick={() => onAddNode('destination')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      {t("workflow.component.destination.title")}
                    </a>
                  </div>
                </div>
              </div>

              {/* Integrations Components */}
              <div className="docs-section" data-section="integrations">
                <button 
                  className="docs-section-toggle w-full flex items-center justify-between text-left py-2 text-dark hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    const section = e.currentTarget.closest('.docs-section') as HTMLElement;
                    if (section) {
                      section.classList.toggle('expanded');
                      const subsection = section.querySelector('.docs-subsection') as HTMLElement;
                      const isExpanded = section.classList.contains('expanded');
                      if (subsection) {
                        if (isExpanded) {
                          subsection.style.maxHeight = subsection.scrollHeight + 'px';
                        } else {
                          subsection.style.maxHeight = '0px';
                        }
                      }
                    }
                  }}
                  aria-expanded="false"
                >
                  <span className="font-semibold">Integrations</span>
                  <svg className="docs-chevron w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                <div className="docs-subsection max-h-0 overflow-hidden transition-all duration-300">
                  <div className="pl-4 space-y-1 pt-2">
                    <a 
                      onClick={() => onAddNode('webhook')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      Webhook
                    </a>
                  </div>
                </div>
              </div>

              {/* AI Components */}
              <div className="docs-section" data-section="ai">
                <button 
                  className="docs-section-toggle w-full flex items-center justify-between text-left py-2 text-dark hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    const section = e.currentTarget.closest('.docs-section') as HTMLElement;
                    if (section) {
                      section.classList.toggle('expanded');
                      const subsection = section.querySelector('.docs-subsection') as HTMLElement;
                      const isExpanded = section.classList.contains('expanded');
                      if (subsection) {
                        if (isExpanded) {
                          subsection.style.maxHeight = subsection.scrollHeight + 'px';
                        } else {
                          subsection.style.maxHeight = '0px';
                        }
                      }
                    }
                  }}
                  aria-expanded="false"
                >
                  <span className="font-semibold">AI</span>
                  <svg className="docs-chevron w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
                <div className="docs-subsection max-h-0 overflow-hidden transition-all duration-300">
                  <div className="pl-4 space-y-1 pt-2">
                    <a 
                      onClick={() => onAddNode('ai-agent')}
                      className="block text-dark hover:text-gray-600 cursor-pointer py-1"
                    >
                      AI Agent
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function WorkflowPage({ params }: WorkflowPageProps) {
  const { t } = useTranslation();
  const resolvedParams = use(params);
  const { workspaceSlug, workflowId } = resolvedParams;
  
  // State management
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowEdge>([]);
  const [fetchComplete, setFetchComplete] = useState(false);
  const [userInputted, setUserInputted] = useState(false);
  const [activeWorkflowItem, setActiveWorkflowItem] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Debounced state for auto-save
  const [debouncedNodes, setDebouncedNodes] = useState<WorkflowNode[]>([]);
  const [debouncedEdges, setDebouncedEdges] = useState<WorkflowEdge[]>([]);
  
  // Track last saved state to detect actual changes
  const [lastSavedNodes, setLastSavedNodes] = useState<WorkflowNode[]>([]);
  const [lastSavedEdges, setLastSavedEdges] = useState<WorkflowEdge[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Hooks
  const graphqlClient = useGraphQLClient();
  const { workspace } = useWorkspace();

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Handle active workflow item modal
  useEffect(() => {
    if (activeWorkflowItem) {
      setShowModal(true);
    }
  }, [activeWorkflowItem]);

  useEffect(() => {
    if (!showModal) {
      const updatedNodes = nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          activeWorkflowItem: null,
        },
      }));
      setNodes(updatedNodes);
      setActiveWorkflowItem(null);
    }
  }, [showModal]);

  // Setup debouncing for auto-save
  useEffect(() => {
    // Don't debounce if it's the initial load
    if (isInitialLoad) return;
    
    const timeout = setTimeout(() => {
      setDebouncedNodes(nodes);
      setDebouncedEdges(edges);
    }, 500);
    return () => clearTimeout(timeout);
  }, [nodes, edges, isInitialLoad]);

  // Check for active workflow item in nodes
  const checkActiveWorkflowItem = (nodes: WorkflowNode[]) => {
    const hasActiveItem = nodes.some(node => node.data && node.data.activeWorkflowItem === true);
    if (hasActiveItem) {
      const activeItem = nodes.find(node => node.data && node.data.activeWorkflowItem === true);
      if (activeItem) {
        setActiveWorkflowItem(activeItem.id);
      }
    }
  };

  // Helper function to compare nodes/edges for changes
  const hasChanges = (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
    // Deep comparison of nodes and edges
    if (newNodes.length !== lastSavedNodes.length || newEdges.length !== lastSavedEdges.length) {
      return true;
    }
    
    // Compare nodes
    for (let i = 0; i < newNodes.length; i++) {
      const newNode = newNodes[i];
      const savedNode = lastSavedNodes[i];
      
      if (!savedNode || 
          newNode.id !== savedNode.id ||
          newNode.type !== savedNode.type ||
          newNode.position.x !== savedNode.position.x ||
          newNode.position.y !== savedNode.position.y ||
          JSON.stringify(newNode.data) !== JSON.stringify(savedNode.data)) {
        return true;
      }
    }
    
    // Compare edges
    for (let i = 0; i < newEdges.length; i++) {
      const newEdge = newEdges[i];
      const savedEdge = lastSavedEdges[i];
      
      if (!savedEdge ||
          newEdge.id !== savedEdge.id ||
          newEdge.source !== savedEdge.source ||
          newEdge.target !== savedEdge.target ||
          newEdge.type !== savedEdge.type ||
          JSON.stringify(newEdge.data) !== JSON.stringify(savedEdge.data)) {
        return true;
      }
    }
    
    return false;
  };

  // Auto-save when debounced nodes/edges change
  useEffect(() => {
    // Skip if initial load, no data, or no actual changes
    if (isInitialLoad || 
        !debouncedNodes.length || 
        !hasChanges(debouncedNodes, debouncedEdges)) {
      return;
    }
    
    console.log('🔄 Changes detected, auto-saving workflow...');
    
    checkActiveWorkflowItem(debouncedNodes);
    
    const cleanNodes = debouncedNodes.map(node => {
      const { activeWorkflowItem, ...rest } = node.data;
      return {
        ...node,
        data: rest
      };
    });

    // Save to GraphQL endpoint
    saveWorkflowChanges(cleanNodes, debouncedEdges);
    setNodes(cleanNodes);
    
    // Update last saved state
    setLastSavedNodes([...cleanNodes]);
    setLastSavedEdges([...debouncedEdges]);
  }, [debouncedNodes, debouncedEdges, lastSavedNodes, lastSavedEdges, isInitialLoad]);

  // Save workflow changes to GraphQL
  const saveWorkflowChanges = async (nodesToSave: WorkflowNode[], edgesToSave: WorkflowEdge[]) => {
    if (!workspaceSlug || !workflowId) return;

    try {
      await executeMutation(
        graphqlClient,
        UPDATE_WORKFLOW,
        {
          workspaceSlug,
          workflowId,
          name: workflow?.name || 'Untitled Workflow',
          description: workflow?.description || '',
          nodes: nodesToSave || [],
          edges: edgesToSave || [],
          triggers: workflow?.triggers || [],
          tags: workflow?.tags || []
        }
      );
      console.log('✅ Workflow auto-saved successfully');
    } catch (error) {
      console.error('❌ Error auto-saving workflow:', error);
    }
  };

  // Fetch workflow data from GraphQL
  useEffect(() => {
    const fetchWorkflow = async () => {
      if (hasHydrated && workspaceSlug && workflowId) {
        setIsLoading(true);
        
        try {
          // Check if we can get a valid token first
          const tokenResponse = await fetch('/api/auth/token');
          if (tokenResponse.ok) {
            const { token } = await tokenResponse.json();
            console.log("Using token:", token ? `${token.substring(0, 15)}...` : 'No token available');
          }
        } catch (error) {
          console.error("Error fetching auth token:", error);
        }
        
        try {
          // First try to get the specific workflow
          const result = await executeQuery(
            graphqlClient,
            GET_WORKFLOWS,
            { 
              workspaceSlug,
              workflowId 
            }
          );
          
          if (result.data?.workflows && result.data.workflows.length > 0) {
            const fetchedWorkflow = result.data.workflows[0];
            setWorkflow(fetchedWorkflow);
            
            // Set nodes and edges from the fetched workflow
            const initialNodes = fetchedWorkflow.nodes || [];
            const initialEdges = fetchedWorkflow.edges || [];
            
            setNodes(initialNodes);
            setEdges(initialEdges);
            
            // Set initial saved state to prevent immediate auto-save
            setLastSavedNodes([...initialNodes]);
            setLastSavedEdges([...initialEdges]);
            
            setFetchComplete(true);
            
            // Mark initial load as complete after state is set
            setTimeout(() => setIsInitialLoad(false), 100);
            
            console.log('✅ Workflow loaded successfully:', {
              id: fetchedWorkflow.id,
              name: fetchedWorkflow.name,
              nodesCount: initialNodes.length,
              edgesCount: initialEdges.length
            });
          } else if (result.error) {
            console.error("Error fetching workflow:", result.error);
            toast.error(`Failed to load workflow: ${result.error.message}`);
          } else {
            console.log("No specific workflow found, trying to fetch all workflows:", result.data);
            
            // Fallback: try to get all workflows and find the one we need
            try {
              const allWorkflowsResult = await executeQuery(
                graphqlClient,
                GET_WORKFLOWS,
                { 
                  workspaceSlug
                }
              );
              
              if (allWorkflowsResult.data?.workflows) {
                const foundWorkflow = allWorkflowsResult.data.workflows.find(w => w.id === workflowId);
                if (foundWorkflow) {
                  setWorkflow(foundWorkflow);
                  
                  const initialNodes = foundWorkflow.nodes || [];
                  const initialEdges = foundWorkflow.edges || [];
                  
                  setNodes(initialNodes);
                  setEdges(initialEdges);
                  
                  // Set initial saved state to prevent immediate auto-save
                  setLastSavedNodes([...initialNodes]);
                  setLastSavedEdges([...initialEdges]);
                  
                  setFetchComplete(true);
                  
                  // Mark initial load as complete after state is set
                  setTimeout(() => setIsInitialLoad(false), 100);
                } else {
                  console.log("Workflow not found in all workflows list. Available workflows:", 
                    allWorkflowsResult.data.workflows.map(w => ({ id: w.id, name: w.name })));
                  toast.error("The workflow you are looking for does not exist or you do not have permission to view it.");
                }
              } else {
                toast.error("Unable to fetch workflows. You may not have permission to view workflows in this workspace.");
              }
            } catch (fallbackError) {
              console.error("Fallback workflow query failure:", fallbackError);
              toast.error("The workflow you are looking for does not exist or you do not have permission to view it.");
            }
          }
        } catch (error) {
          console.error("GraphQL workflow query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchWorkflow();
  }, [hasHydrated, graphqlClient, workspaceSlug, workflowId]);

  // Navigation handlers
  const handleBackToWorkspaces = () => {
    window.location.href = `/${workspaceSlug}/workflows`;
  };

  const handleToggleStatus = async () => {
    if (!workflow) return;
    
    const newStatus = workflow.status === 'active' ? 'paused' : 'active';
    
    try {
      await executeMutation(
        graphqlClient,
        UPDATE_WORKFLOW,
        {
          workspaceSlug,
          workflowId,
          name: workflow.name,
          description: workflow.description || '',
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          triggers: workflow.triggers || [],
          tags: workflow.tags || [],
          status: newStatus
        }
      );
      
      // Update local state
      setWorkflow(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
    } catch (error) {
      console.error('Error updating workflow status:', error);
      toast.error('Failed to update workflow status');
    }
  };

  const handleAddNode = (nodeType: string) => {
    const newId = String(nodes.length + 1);
    const newNode = { 
      id: newId, 
      type: nodeType, 
      data: {}, 
      position: { x: 250, y: 100 } 
    };
    setNodes([...nodes, newNode]);
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!workflow) return;
    
    try {
      await executeMutation(
        graphqlClient,
        UPDATE_WORKFLOW,
        {
          workspaceSlug,
          workflowId,
          name: newTitle,
          description: workflow.description || '',
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          triggers: workflow.triggers || [],
          tags: workflow.tags || [],
          status: workflow.status
        }
      );
      
      // Update local state
      setWorkflow(prev => prev ? { ...prev, name: newTitle } : null);
      toast.success('Workflow title updated successfully');
    } catch (error) {
      console.error('Error updating workflow title:', error);
      toast.error('Failed to update workflow title');
    }
  };

  // Click outside handler to switch back to action menu
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (showMainMenu) {
      const target = e.target as Element;
      const nav = document.querySelector('.workflow-navigation');
      if (nav && !nav.contains(target)) {
        setShowMainMenu(false);
      }
    }
  }, [showMainMenu]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [handleClickOutside]);

  if (!hasHydrated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-dark dark:bg-dark text-light dark:text-light">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-light text-lg">Loading workflow...</div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex h-screen bg-dark dark:bg-dark text-light dark:text-light">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-light text-lg mb-4">Workflow not found</div>
            <button 
              onClick={handleBackToWorkspaces}
              className="px-4 py-2 bg-blue-600 text-light rounded hover:bg-blue-700 transition-colors"
            >
              Back to Workflows
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Meta title={`${workflow.name} - ${(workspace as any)?.name || 'AI Rank'}`} />
      
      <div className="flex h-screen bg-dark dark:bg-dark text-light dark:text-light">
        {/* Custom Navigation */}
        <div className="workflow-navigation">
          <WorkflowNavigation
            workflow={workflow}
            workspace={workspace}
            onBack={handleBackToWorkspaces}
            showMainMenu={showMainMenu}
            onToggleMainMenu={() => setShowMainMenu(!showMainMenu)}
            onToggleStatus={handleToggleStatus}
            onAddNode={handleAddNode}
            onUpdateTitle={handleUpdateTitle}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {/* ReactFlow Canvas - Full Height */}
          <ReactFlowProvider>
            <LayoutFlow
              activeWorkflowItem={activeWorkflowItem}
              setActiveWorkflowItem={setActiveWorkflowItem}
              nodes={nodes}
              edges={edges}
              setNodes={setNodes}
              setEdges={setEdges}
              workspace={workspace}
              workflowId={workflowId}
              t={t}
              setUserInputted={setUserInputted}
              userInputted={userInputted}
            />
          </ReactFlowProvider>
        </div>

        {/* Modal for workflow item editing */}
        <Modal 
          show={showModal} 
          title="Edit Workflow Item" 
          toggle={() => setShowModal(false)}
        >
          {activeWorkflowItem && getForm(activeWorkflowItem)}
        </Modal>
      </div>
    </>
  );
} 