'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { gql } from '@apollo/client';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';

// GraphQL query for workspace configuration
const GET_WORKSPACE_CONFIG = gql`
  query GetWorkspaceConfig($workspaceId: String!) {
    brands(workspaceId: $workspaceId) {
      _id
    }
    models(workspaceId: $workspaceId) {
      _id
      isEnabled
    }
    prompts(workspaceId: $workspaceId) {
      _id
    }
    configs(workspaceId: $workspaceId) {
      configType
      data
    }
  }
`;

// GraphQL mutation for scheduling jobs
const SCHEDULE_JOB = gql`
  mutation ScheduleJob($workspaceId: String!, $jobs: [JobScheduleInput]!) {
    scheduleJobs(workspaceId: $workspaceId, jobs: $jobs) {
      id
      nextRunAt
    }
  }
`;

// GraphQL mutation for updating config
const UPDATE_CONFIG = gql`
  mutation UpdateWorkspaceConfigs($workspaceSlug: String!, $configs: JSON!) {
    updateWorkspaceConfigs(workspaceSlug: $workspaceSlug, configs: $configs) {
      configType
      data
    }
  }
`;

const SetupBanner = () => {
  const pathname = usePathname();
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();
  const [isSchedulingJob, setIsSchedulingJob] = useState(false);
  const [workspaceConfig, setWorkspaceConfig] = useState({
    hasBrands: false,
    hasModels: false,
    hasPrompts: false,
    inSetupMode: true,
    isLoading: true
  });

  // Don't show banner on account selection page
  if (pathname === '/account') return null;

  // Check workspace configuration
  useEffect(() => {
    const checkConfig = async () => {
      if (!workspace?._id) return;

      try {
        const result = await executeQuery(
          graphqlClient,
          GET_WORKSPACE_CONFIG,
          { workspaceId: workspace._id }
        );

        if (result.data) {
          const hasBrands = result.data.brands?.length > 0;
          const hasModels = result.data.models?.some(m => m.isEnabled);
          const hasPrompts = result.data.prompts?.length > 0;

          // Find the setup config
          const setupConfig = result.data.configs?.find(c => c.configType === 'setup');
          const inSetupMode = setupConfig?.data?.inSetupMode !== false;

          setWorkspaceConfig({
            hasBrands,
            hasModels,
            hasPrompts,
            inSetupMode,
            isLoading: false
          });
        }
      } catch (err) {
        console.error('Error checking workspace config:', err);
        setWorkspaceConfig(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkConfig();
  }, [workspace?._id, graphqlClient]);

  // Function to schedule a test job
  const scheduleTestJob = async () => {
    if (!workspace?._id) {
      toast.error('Workspace not loaded');
      return;
    }

    setIsSchedulingJob(true);

    try {
      const result = await executeMutation(
        graphqlClient,
        SCHEDULE_JOB,
        {
          workspaceId: workspace._id,
          jobs: [
            {
              name: 'promptModelTester',
              schedule: 'now',
              data: {
                workspaceId: workspace._id
              }
            }
          ]
        }
      );

      if (result.data?.scheduleJobs) {
        toast.success('Report scheduled successfully! Your dashboard will update once complete.');
        console.log('Scheduled job:', result.data.scheduleJobs[0]);

        // Exit setup mode by updating the config
        try {
          await executeMutation(
            graphqlClient,
            UPDATE_CONFIG,
            {
              workspaceSlug: workspace.slug,
              configs: [
                {
                  configType: 'setup',
                  data: { inSetupMode: false }
                }
              ]
            }
          );

          // Update local state to hide the banner
          setWorkspaceConfig(prev => ({ ...prev, inSetupMode: false }));
        } catch (configErr) {
          console.error('Error updating setup config:', configErr);
          // Don't show error to user - banner will just stay visible
        }
      } else if (result.error) {
        toast.error(`Failed to schedule report: ${result.error.message}`);
        console.error('Job scheduling error:', result.error);
      }
    } catch (err) {
      toast.error(`Error scheduling report: ${err.message}`);
      console.error('Job scheduling error:', err);
    } finally {
      setIsSchedulingJob(false);
    }
  };

  // Don't show banner while loading or if not in setup mode
  if (workspaceConfig.isLoading) return null;
  if (!workspaceConfig.inSetupMode) return null;

  const allConfigured = workspaceConfig.hasBrands && workspaceConfig.hasModels && workspaceConfig.hasPrompts;

  // Show completion banner
  if (allConfigured) {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-l-4 border-green-500 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200">Configuration Complete</h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Your workspace is ready. Run your first report to see your personalized analytics.
              </p>
            </div>
          </div>
          <Button
            background="Green"
            border="Light"
            onClick={scheduleTestJob}
            disabled={isSchedulingJob}
          >
            {isSchedulingJob ? 'Running...' : 'Run Your First Report'}
          </Button>
        </div>
      </div>
    );
  }

  // Show setup progress banner
  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-l-4 border-blue-500 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-lg font-bold text-blue-800 dark:text-blue-200">Setup Your Workspace</h3>
          <p className="mt-1 text-sm text-blue-700 dark:text-blue-300 mb-3">
            Complete these steps to get your personalized ranking report
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/brands`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasBrands
                  ? 'line-through text-green-600 dark:text-green-400 cursor-default'
                  : 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline'
              }`}
              disabled={workspaceConfig.hasBrands}
            >
              Configure Brands
            </button>
            <span className="text-blue-600 dark:text-blue-400">&gt;</span>
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/models`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasModels
                  ? 'line-through text-green-600 dark:text-green-400 cursor-default'
                  : 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline'
              }`}
              disabled={workspaceConfig.hasModels}
            >
              Configure Models
            </button>
            <span className="text-blue-600 dark:text-blue-400">&gt;</span>
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/prompts`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasPrompts
                  ? 'line-through text-green-600 dark:text-green-400 cursor-default'
                  : 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline'
              }`}
              disabled={workspaceConfig.hasPrompts}
            >
              Configure Prompts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupBanner;
