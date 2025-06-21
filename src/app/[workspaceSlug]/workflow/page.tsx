'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../i18n'; // Import i18n initialization

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { executeQuery, executeMutation } from '@/graphql/operations';
import { GET_WORKFLOWS, CREATE_WORKFLOW } from '@/graphql/workflow-operations';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  workspaceCode: string;
  inviteCode: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowDefinition {
  id: string
  name: string
  status: string
  description?: string
  triggers?: Array<{
    id: string
    type: string
    active: boolean
  }>
  createdAt?: string
  updatedAt?: string
}

interface WorkflowPageProps {
  params: Promise<{
    workspaceSlug: string
  }>
}

export default function WorkflowPage({ params }: WorkflowPageProps) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace() as { workspace: Workspace | null };
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [showNameWarning, setShowNameWarning] = useState(false);

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch data with GraphQL when component mounts
  useEffect(() => {
    const fetchGraphQLData = async () => {
      if (hasHydrated && workspaceSlug) {
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
        
        // Fetch workflows
        try {
          console.log('🔄 About to execute workflows query with:', {
            workspaceSlug,
            graphqlClientExists: !!graphqlClient,
            queryType: 'GET_WORKFLOWS'
          });

          const result = await executeQuery(
            graphqlClient, 
            GET_WORKFLOWS,
            { workspaceSlug }
          );
          
          console.log('📥 Workflows query result:', {
            hasData: !!result.data,
            hasError: !!result.error,
            dataKeys: result.data ? Object.keys(result.data) : null,
            errorMessage: result.error?.message,
            fullResult: result
          });
          
          if (result.data) {
            console.log('✅ Setting workflows:', result.data.workflows);
            setWorkflows(result.data.workflows || []);
          } else if (result.error) {
            console.error("❌ Error fetching workflows:", result.error);
            toast.error(`Failed to load workflows: ${result.error.message}`);
          }
        } catch (error) {
          console.error("💥 GraphQL workflows query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  const handleValidateName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewWorkflowName(value);
    setShowNameWarning(value.trim() === '');
  };

  const toggleModal = () => setShowModal(!showModal);

  const handleAddWorkflow = async () => {
    if (!newWorkflowName || !workspace?.slug) {
      return;
    }
    
    try {
      setIsLoading(true);
      setIsSubmitting(true);
      
      const result = await executeMutation(
        graphqlClient,
        CREATE_WORKFLOW,
        {
          workspaceSlug: workspace.slug,
          name: newWorkflowName,
          description: '',
          nodes: [],
          edges: [],
          triggers: [],
          tags: []
        }
      );
      
      if (result.data) {
        toast.success('Workflow created successfully');
        toggleModal();
        setNewWorkflowName('');
        // Refresh the list
        if (workspace?.id) {
          const refreshResult = await executeQuery(
            graphqlClient,
            GET_WORKFLOWS,
            { workspaceSlug }
          );
          if (refreshResult.data) {
            setWorkflows(refreshResult.data.workflows || []);
          }
        }
      } else if (result.error) {
        console.error('Error adding workflow:', result.error);
        toast.error(`Failed to create workflow: ${result.error.message}`);
      }
    } catch (error) {
      console.error('Error adding workflow:', error);
      toast.error('Failed to create workflow');
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("workflow.title") || "Workflows"}`} />
      <Content.Title
        title={t("workflow.title") || "Workflows"}
        subtitle={t("workflow.subtitle") || "Manage your workflows"}
      />
      <Content.Divider thick />
      <Content.Container>
        <Card danger={false}>
          <Card.Body title={t("workflow.list.title") || "Workflows"} subtitle="" image="" icon="">
            {workflows && workflows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("workflow.table.workflowname") || "Name"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("workflow.table.workflowid") || "ID"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Triggers
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workflows.filter(workflow => workflow && workflow.id).map((workflow, index) => (
                      <tr key={workflow.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace?.slug || workspaceSlug)}/workflow/${encodeURI(workflow.id)}`} className="text-sm font-medium text-gray-900 underline"> 
                            {workflow.name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace?.slug || workspaceSlug)}/workflow/${encodeURI(workflow.id)}`} className="text-sm font-medium text-gray-900"> 
                            {workflow.id}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                            workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                            workflow.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {workflow.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {workflow.triggers?.length || 0} triggers
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              <p className="">{t("workflow.empty") || "No workflows configured yet."}</p>
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              width="Full"
              disabled={isLoading}
              onClick={toggleModal}
            >
              {t("workflow.list.action.addworkflow") || "Add Workflow"}
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>

      {/* Add Workflow Modal */}
      <Modal show={showModal} title={t("workflow.modal.addworkflow.title") || "Add Workflow"} toggle={toggleModal}>
        <div className="space-y-0 text-sm text-gray-600">
          <p>
            {t("workflow.modal.addworkflow.description.lineOne") || "Create a new workflow to automate your processes."}
          </p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-md text-dark">
              {t("workflow.modal.addworkflow.field.name") || "Workflow Name"}
            </p>
            <input
              className="w-full px-3 py-2 bg-light border-2 border-dark"
              disabled={isSubmitting}
              type="text"
              value={newWorkflowName}
              onChange={handleValidateName}
            />
            {showNameWarning && (
              <p className="text-sm text-red-500">
                {t("workflow.modal.addworkflow.field.name.warning") || "Workflow name is required"}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch">
          <Button
            background="Pink"
            border="Dark"
            width="Full"
            onClick={handleAddWorkflow}
            disabled={!newWorkflowName || isSubmitting}
          >
            <span>{t('workflow.modal.addworkflow.action.addworkflow') || 'Add Workflow'}</span>
          </Button>
        </div>
      </Modal>
    </AccountLayout>
  );
} 