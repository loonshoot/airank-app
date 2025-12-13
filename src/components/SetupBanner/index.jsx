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
      isOwnBrand
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
    hasOwnBrand: false,
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
          const hasOwnBrand = result.data.brands?.some(b => b.isOwnBrand === true);
          const hasBrands = result.data.brands?.length > 0;
          const hasModels = result.data.models?.some(m => m.isEnabled);
          const hasPrompts = result.data.prompts?.length > 0;

          // Find the setup config
          const setupConfig = result.data.configs?.find(c => c.configType === 'setup');
          const inSetupMode = setupConfig?.data?.inSetupMode !== false;

          setWorkspaceConfig({
            hasOwnBrand,
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

  const allConfigured = workspaceConfig.hasOwnBrand && workspaceConfig.hasModels && workspaceConfig.hasPrompts;

  // Show completion banner
  if (allConfigured) {
    return (
      <div className="bg-green-800 py-2 px-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white">
            Your workspace is ready. Run your first report to see your personalized analytics.
          </p>
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
    <div className="sticky top-0 z-10 bg-green-800 py-2 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-white">Complete these steps to get your personalized ranking report:</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/brands`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasOwnBrand
                  ? 'line-through text-green-300 cursor-default'
                  : 'text-white hover:text-green-200 underline'
              }`}
              disabled={workspaceConfig.hasOwnBrand}
            >
              Set Primary Brand
            </button>
            <span className="text-green-300">&gt;</span>
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/models`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasModels
                  ? 'line-through text-green-300 cursor-default'
                  : 'text-white hover:text-green-200 underline'
              }`}
              disabled={workspaceConfig.hasModels}
            >
              Configure Models
            </button>
            <span className="text-green-300">&gt;</span>
            <button
              onClick={() => window.location.href = `/${workspace?.slug}/prompts`}
              className={`text-sm font-medium transition-all ${
                workspaceConfig.hasPrompts
                  ? 'line-through text-green-300 cursor-default'
                  : 'text-white hover:text-green-200 underline'
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
