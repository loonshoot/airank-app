'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../../i18n'; // Import i18n initialization

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { gql } from '@apollo/client';
import { 
  executeQuery,
  executeMutation
} from '@/graphql/operations';

// Define GraphQL queries and mutations
const GET_SOURCE_DETAIL = gql`
  query Sources($workspaceSlug: String!) {
    sources(workspaceSlug: $workspaceSlug) {
      _id
      name
      sourceType
      status
    }
  }
`;

const DELETE_SOURCE = gql`
  mutation DeleteSource($sourceId: ID!) {
    deleteSource(sourceId: $sourceId) {
      success
      message
    }
  }
`;

export default function SourceDetailPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug, sourceId } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [source, setSource] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Delete source modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteSourceName, setDeleteSourceName] = useState('');
  const [confirmation, setConfirmation] = useState('');

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch data with GraphQL when component mounts
  useEffect(() => {
    const fetchGraphQLData = async () => {
      if (hasHydrated && workspaceSlug && sourceId) {
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
        
        // Fetch source details
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_SOURCE_DETAIL,
            { workspaceSlug }
          );
          
          if (result.data) {
            // Find the specific source by ID
            const foundSource = result.data.sources?.find(s => s._id === sourceId);
            setSource(foundSource || null);
          } else if (result.error) {
            console.error("Error fetching source details:", result.error);
            toast.error(`Failed to load source details: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL source detail query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient, workspaceSlug, sourceId]);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== deleteSourceName.toLowerCase()) {
      return;
    }
    confirmDeleteSource();
  };

  // Execute delete mutation
  const confirmDeleteSource = async () => {
    setSubmittingState(true);
    
    try {
      const result = await executeMutation(
        graphqlClient, 
        DELETE_SOURCE, 
        { 
          sourceId 
        }
      );
      
      if (result.data?.deleteSource?.success) {
        toast.success('Source deleted successfully!');
        
        // Redirect to sources listing page
        window.location.href = `/${workspaceSlug}/sources`;
      } else if (result.error) {
        toast.error(result.error.message || 'Failed to delete source');
      } else {
        toast.error('Failed to delete source');
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  const renderSourceDetails = () => {
    if (!source) return null;

    return (
      <div className="space-y-4">
        <p className="text-md text-light">
          {t("source.table.name") || "Name"}: {source.name}
        </p>
        <p className="text-md text-light">
          {t("source.table.type") || "Type"}: {source.sourceType}
        </p>
        <p className="text-md text-light">
          {t("source.table.status") || "Status"}: {source.status}
        </p>
        <p className="text-md text-light">
          {t("source.table.id") || "ID"}: {source._id}
        </p>
      </div>
    );
  };

  // Helper function to format dates nicely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const renderRecentActivity = () => {
    if (!source?.recentActivity || source.recentActivity.length === 0) {
      return <p>{t("source.recentActivity.empty") || "No recent activity"}</p>;
    }

    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("source.activity.table.description") || "Description"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("source.activity.table.status") || "Status"}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("source.activity.table.timestamp") || "Timestamp"}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {source.recentActivity.map((activity) => (
            <tr key={activity.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {activity.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                {activity.status}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(activity.timestamp).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${source?.name || t("source.title") || "Source"}`} />
      <Content.Title
        title={t("source.title") || "Source Details"}
        subtitle={source ? `${source.name} - ${source._id}` : "Loading..."}
      />
      <Content.Divider />
      <Content.Container>
        {/* Source Details Card */}
        <Card>
          <Card.Body
            title={t("source.details.title") || "Source Information"}
          >
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              renderSourceDetails()
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              disabled={isLoading || isSubmitting}
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteSourceName(source?.name || '');
              }}
            >
              {t("source.overview.actions.delete") || "Delete Source"}
            </Button>
          </Card.Footer>
        </Card>
        
        {/* Source Configuration Card */}
        <Card>
          <Card.Body
            title={t("source.configuration.title") || "Configuration"}
          >
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              <p className="text-gray-600">{t("source.configuration.description") || "Source configuration details would be displayed here."}</p>
            )}
          </Card.Body>
        </Card>
      </Content.Container>

      {/* Delete Source Modal */}
      <Modal 
        show={showDeleteModal} 
        title={t("source.modal.deleteSource.title") || "Delete Source"} 
        toggle={() => setShowDeleteModal(!showDeleteModal)}
      >
        <div className="space-y-4">
          <p className="text-red-500">{t("source.modal.deleteSource.warning") || "This action cannot be undone."}</p>
          <p>{t("source.modal.deleteSource.description") || "Type the source name to confirm deletion:"} <strong>{deleteSourceName}</strong></p>
          <input
            type="text"
            className="w-full px-3 py-2 bg-light border-2 border-dark"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <Button
            background="Pink"
            border="Dark"
            width="Full"
            onClick={handleDelete}
            disabled={confirmation.toLowerCase() !== deleteSourceName.toLowerCase() || isSubmitting}
          >
            {isSubmitting ? t("common.status.processing") || "Processing..." : t("common.action.confirm") || "Confirm"}
          </Button>
        </div>
      </Modal>
    </AccountLayout>
  );
}