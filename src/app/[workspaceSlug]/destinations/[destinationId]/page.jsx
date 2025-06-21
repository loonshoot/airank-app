'use client';

import { useEffect, useState, use } from 'react';
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
const GET_DESTINATION_DETAIL = gql`
  query DestinationDetail($workspaceSlug: String!, $destinationId: ID) {
    destinations(workspaceSlug: $workspaceSlug, id: $destinationId) {
      _id
      name
      destinationType
      targetSystem
      status
      rateLimits {
        requestsPerInterval
        intervalMs
      }
      mappings {
        people {
          enabled
          fields
        }
        organizations {
          enabled
          fields
        }
      }
      createdAt
      updatedAt
    }
    jobs(workspaceSlug: $workspaceSlug, destinationId: $destinationId) {
      _id
      status
      nextRunAt
      lastRunAt
    }
  }
`;

const DELETE_DESTINATION = gql`
  mutation DeleteDestination($deleteDestinationId: ID!, $workspaceSlug: String) {
    deleteDestination(id: $deleteDestinationId, workspaceSlug: $workspaceSlug) {
      message
      remainingDestinations {
        _id
        name
        destinationType
        targetSystem
        status
      }
    }
  }
`;

export default function DestinationDetailPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug, destinationId } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [destination, setDestination] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Delete destination modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDestinationName, setDeleteDestinationName] = useState('');
  const [confirmation, setConfirmation] = useState('');

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch data with GraphQL when component mounts
  useEffect(() => {
    const fetchGraphQLData = async () => {
      if (hasHydrated && workspaceSlug && destinationId) {
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
        
        // Fetch destination details
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_DESTINATION_DETAIL,
            { 
              workspaceSlug,
              destinationId 
            }
          );
          
          if (result.data) {
            if (result.data.destinations && result.data.destinations.length > 0) {
              setDestination(result.data.destinations[0]);
            }
            setJobs(result.data.jobs || []);
          } else if (result.error) {
            console.error("Error fetching destination details:", result.error);
            toast.error(`Failed to load destination details: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL destination detail query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient, workspaceSlug, destinationId]);

  // Handle delete confirmation
  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== deleteDestinationName.toLowerCase()) {
      return;
    }
    confirmDeleteDestination();
  };

  // Execute delete mutation
  const confirmDeleteDestination = async () => {
    setSubmittingState(true);
    
    try {
      const result = await executeMutation(
        graphqlClient, 
        DELETE_DESTINATION, 
        { 
          deleteDestinationId: destinationId,
          workspaceSlug 
        }
      );
      
      if (result.data?.deleteDestination) {
        toast.success('Destination deleted successfully!');
        
        // Redirect to destinations listing page
        window.location.href = `/${workspaceSlug}/destinations`;
      } else if (result.error) {
        toast.error(result.error.message || 'Failed to delete destination');
      } else {
        toast.error('Failed to delete destination');
      }
    } catch (error) {
      console.error('Error deleting destination:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  const renderDestinationDetails = () => {
    if (!destination) return null;

    return (
      <div className="space-y-4">
        <p className="text-md text-light">
          {t("destination.table.name")}: {destination.name}
        </p>
        <p className="text-md text-light">
          {t("destination.table.type")}: {destination.destinationType}
        </p>
        <p className="text-md text-light">
          {t("destination.table.target")}: {destination.targetSystem}
        </p>
        <p className="text-md text-light">
          {t("destination.table.status")}: {destination.status}
        </p>
        
        <div className="space-y-2">
          <p className="text-md text-light font-bold">
            {t("destination.table.rateLimits")}:
          </p>
          <ul className="list-disc pl-5">
            <li>
              {t("destination.table.requestsPerInterval")}: {destination.rateLimits?.requestsPerInterval}
            </li>
            <li>
              {t("destination.table.intervalMs")}: {destination.rateLimits?.intervalMs}
            </li>
          </ul>
        </div>
        
        <div className="space-y-2">
          <p className="text-md text-light font-bold">
            {t("destination.table.mappings")}:
          </p>
          
          <div className="pl-3 space-y-2">
            <p className="text-md text-light font-bold">
              {t("destination.table.people")}:
            </p>
            <p className="text-sm text-light">
              {t("destination.table.enabled")}: {destination.mappings?.people?.enabled ? 'Yes' : 'No'}
            </p>
            
            {destination.mappings?.people?.enabled && destination.mappings?.people?.fields?.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-light font-bold">
                  {t("destination.table.fields")}:
                </p>
                <ul className="list-disc pl-5">
                  {destination.mappings.people.fields.map((field, index) => (
                    <li key={index} className="text-sm">{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="pl-3 space-y-2">
            <p className="text-md text-light font-bold">
              {t("destination.table.organizations")}:
            </p>
            <p className="text-sm text-light">
              {t("destination.table.enabled")}: {destination.mappings?.organizations?.enabled ? 'Yes' : 'No'}
            </p>
            
            {destination.mappings?.organizations?.enabled && destination.mappings?.organizations?.fields?.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm text-light font-bold">
                  {t("destination.table.fields")}:
                </p>
                <ul className="list-disc pl-5">
                  {destination.mappings.organizations.fields.map((field, index) => (
                    <li key={index} className="text-sm">{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-md text-light">
          {t("destination.table.createdAt")}: {formatDate(destination.createdAt)}
        </p>
        <p className="text-md text-light">
          {t("destination.table.updatedAt")}: {formatDate(destination.updatedAt)}
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

  const renderJobHistory = () => {
    if (!jobs || jobs.length === 0) {
      return <p>{t("destination.jobhistory.empty")}</p>;
    }

    return (
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("destination.job.table.jobid")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("destination.job.table.status")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {t("destination.job.table.date")}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {jobs.map((job) => (
            <tr key={job._id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {job._id}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                {job.status}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {job.status === 'scheduled' ? (
                  <span>
                    {new Date(job.nextRunAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                ) : (
                  <span>
                    {new Date(job.lastRunAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${destination?.name || t("destination.title")}`} />
      <Content.Title
        title={t("destination.title")}
        subtitle={destination ? `${destination.name} - ${destination._id}` : "Loading..."}
      />
      <Content.Divider />
      <Content.Container>
        {/* Destination Details Card */}
        <Card>
          <Card.Body
            title={t("destination.details.title")}
          >
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              renderDestinationDetails()
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              disabled={isLoading || isSubmitting}
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteDestinationName(destination?.name || '');
              }}
            >
              {t("destination.overview.actions.delete")}
            </Button>
          </Card.Footer>
        </Card>
        
        {/* Job History Card */}
        <Card>
          <Card.Body
            title={t("destination.jobhistory.title")}
          >
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              renderJobHistory()
            )}
          </Card.Body>
        </Card>
      </Content.Container>

      {/* Delete Destination Modal */}
      <Modal 
        show={showDeleteModal} 
        title={t("destination.modal.deleteDestination.title")} 
        toggle={() => setShowDeleteModal(!showDeleteModal)}
      >
        <div className="space-y-4">
          <p className="text-red-500">{t("destination.modal.deleteDestination.warning")}</p>
          <p>{t("destination.modal.deleteDestination.description", { deleteDestinationName })}</p>
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
            disabled={confirmation.toLowerCase() !== deleteDestinationName.toLowerCase() || isSubmitting}
          >
            {isSubmitting ? t("common.status.processing") : t("common.action.confirm")}
          </Button>
        </div>
      </Modal>
    </AccountLayout>
  );
} 