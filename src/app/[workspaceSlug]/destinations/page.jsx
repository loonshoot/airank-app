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
import { gql } from '@apollo/client';
import { 
  executeQuery,
  executeMutation
} from '@/graphql/operations';

// Define GraphQL queries and mutations
const GET_DESTINATIONS = gql`
  query Destinations($workspaceSlug: String!) {
    destinations(workspaceSlug: $workspaceSlug) {
      _id
      name
      destinationType
      targetSystem
      status
    }
  }
`;

const ARCHIVE_DESTINATION = gql`
  mutation ArchiveDestination($archiveDestinationId: ID!, $workspaceSlug: String) {
    archiveDestination(id: $archiveDestinationId, workspaceSlug: $workspaceSlug) {
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

export default function DestinationsPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Archive destination modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveDestinationName, setArchiveDestinationName] = useState('');
  const [archiveDestinationId, setArchiveDestinationId] = useState(null);
  const [confirmation, setConfirmation] = useState('');

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Sort destinations function (active first, then archived)
  const sortDestinations = (destinationsArray) => {
    return [...destinationsArray].sort((a, b) => {
      if (a.status === "archived" && b.status !== "archived") return 1;
      if (a.status !== "archived" && b.status === "archived") return -1;
      return 0;
    });
  };

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
        
        // Fetch destinations
        try {
          const destinationsResult = await executeQuery(
            graphqlClient, 
            GET_DESTINATIONS,
            { workspaceSlug }
          );
          
          if (destinationsResult.data) {
            setDestinations(sortDestinations(destinationsResult.data.destinations || []));
          } else if (destinationsResult.error) {
            console.error("Error fetching destinations:", destinationsResult.error);
            toast.error(`Failed to load destinations: ${destinationsResult.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL destinations query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  // Handle archive confirmation
  const handleArchive = async () => {
    if (confirmation.toLowerCase() !== archiveDestinationName.toLowerCase()) {
      return;
    }
    confirmArchiveDestination();
  };

  // Execute archive mutation
  const confirmArchiveDestination = async () => {
    setSubmittingState(true);
    
    try {
      const result = await executeMutation(
        graphqlClient, 
        ARCHIVE_DESTINATION, 
        { 
          archiveDestinationId: archiveDestinationId,
          workspaceSlug 
        }
      );
      
      if (result.data?.archiveDestination) {
        toast.success('Destination archived successfully!');
        
        // Update destinations list with the returned data
        if (result.data.archiveDestination.remainingDestinations) {
          setDestinations(sortDestinations(result.data.archiveDestination.remainingDestinations));
        }
        
        // Reset modal state
        setShowArchiveModal(false);
        setArchiveDestinationName('');
        setArchiveDestinationId(null);
        setConfirmation('');
      } else if (result.error) {
        toast.error(result.error.message || 'Failed to archive destination');
      } else {
        toast.error('Failed to archive destination');
      }
    } catch (error) {
      console.error('Error archiving destination:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("workspace.dashboard.header.meta")}`} />
      <Content.Title
        title={t("destinations.title")}
        subtitle={t("destinations.subtitle")}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title={t("destinations.list.title")}>
            {destinations && destinations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("destinations.table.name")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("destinations.table.type")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("destinations.table.target")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("destinations.table.status")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("destinations.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {destinations.map((destination, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${workspaceSlug}/destinations/${destination._id}`} className="text-sm font-medium text-gray-900 underline"> 
                            {destination.name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900"> 
                            {destination.destinationType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900"> 
                            {destination.targetSystem}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900 capitalize"> 
                            {destination.status}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {destination.status !== "archived" && (
                            <button
                              className="text-sm font-medium text-gray-900 underline uppercase"
                              onClick={() => {
                                setShowArchiveModal(true);
                                setArchiveDestinationName(destination.name);
                                setArchiveDestinationId(destination._id);
                              }}
                            >
                              {t("destinations.table.actions.archive")}
                            </button>
                          )}
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
              <p className="">{t("destinations.empty")}</p>
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              disabled={isLoading || isSubmitting}
              onClick={() => window.location.href = `/${workspaceSlug}/destinations/add`}
            >
              {t("destinations.list.action.adddestination")}
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>

      {/* Archive Destination Modal */}
      <Modal 
        show={showArchiveModal} 
        title={t("destinations.modal.archiveDestination.title")} 
        toggle={() => setShowArchiveModal(!showArchiveModal)}
      >
        <div className="space-y-4">
          <p className="text-red-500">{t("destinations.modal.archiveDestination.warning")}</p>
          <p>{t("destinations.modal.archiveDestination.description", { archiveDestinationName })}</p>
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
            onClick={handleArchive}
            disabled={confirmation.toLowerCase() !== archiveDestinationName.toLowerCase() || isSubmitting}
          >
            {isSubmitting ? t("common.status.processing") : t("common.action.confirm")}
          </Button>
        </div>
      </Modal>
    </AccountLayout>
  );
} 