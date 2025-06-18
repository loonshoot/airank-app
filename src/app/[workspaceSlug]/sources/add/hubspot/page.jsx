'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../../../i18n'; // Import i18n initialization

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { gql } from '@apollo/client';
import { 
  executeQuery,
  executeMutation
} from '@/graphql/operations';
import { useMutation } from '@apollo/client';

// Define GraphQL queries and mutations
const GET_HUBSPOT_TOKENS = gql`
  query GetHubspotTokens($workspaceSlug: String, $service: String) {
    tokens(workspaceSlug: $workspaceSlug, service: $service) {
      _id
      email
      scopes
      errorMessages
      displayName
      externalId
    }
  }
`;

const REGISTER_EXTERNAL_CREDENTIALS = gql`
  mutation RegisterExternalCredentials($workspaceSlug: String, $code: String!, $service: String!, $scope: String) {
    registerExternalCredentials(workspaceSlug: $workspaceSlug, code: $code, service: $service, scope: $scope) {
      message
      remainingTokens {
        _id
        email
        scopes
        errorMessages
        displayName
        externalId
      }
    }
  }
`;

const DELETE_EXTERNAL_CREDENTIALS = gql`
  mutation DeleteExternalCredentials($deleteExternalCredentialsId: ID!, $workspaceSlug: String) {
    deleteExternalCredentials(id: $deleteExternalCredentialsId, workspaceSlug: $workspaceSlug) {
      message
      remainingTokens {
        _id
        email
        scopes
        errorMessages
        displayName
        externalId
      }
    }
  }
`;

const CREATE_SOURCE = gql`
  mutation CreateSource($name: String!, $sourceType: String!, $matchingField: String!, $tokenId: String, $workspaceSlug: String, $batchConfig: JSON) {
    createSource(name: $name, sourceType: $sourceType, matchingField: $matchingField, tokenId: $tokenId, workspaceSlug: $workspaceSlug, batchConfig: $batchConfig) {
      _id
    }
  }
`;

const SCHEDULE_JOBS = gql`
  mutation ScheduleJobs($workspaceSlug: String, $jobs: [JobScheduleInput]!) {
    scheduleJobs(workspaceSlug: $workspaceSlug, jobs: $jobs) {
      id
      nextRunAt
    }
  }
`;

export default function HubSpotSourcePage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [tokens, setTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  
  // OAuth and configuration state
  const [code, setCode] = useState(null);
  const [service, setService] = useState("hubspot");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sourceName, setSourceName] = useState('HubSpot CRM');
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  const [isProcessingCode, setIsProcessingCode] = useState(false);
  
  // Configuration options - always sync all data
  const syncContacts = true;
  const syncCompanies = true;
  const syncDeals = true;
  
  // Required scopes array definition - exact match from working Pages Router implementation
  const requiredScopes = [
    'tickets',
    'crm.schemas.deals.read',
    'e-commerce',
    'oauth',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read'
  ];
  
  // Optional scopes array definition - exact match from working Pages Router implementation
  const optionalScopes = [
    'crm.objects.carts.read',
    'crm.objects.subscriptions.read',
    'crm.objects.commercepayments.read',
    'crm.objects.orders.read',
    'crm.objects.invoices.read',
    'crm.objects.courses.read',
    'crm.objects.listings.read',
    'crm.objects.leads.read',
    'crm.objects.services.read',
    'crm.objects.users.read',
    'crm.objects.partner-clients.read',
    'crm.objects.appointments.read',
    'crm.objects.feedback_submissions.read',
    'crm.objects.custom.read',
    'crm.schemas.custom.read',
    'sales-email-read',
    'crm.objects.goals.read',
    'crm.objects.quotes.read',
    'crm.schemas.quotes.read',
    'crm.schemas.line_items.read',
    'crm.pipelines.orders.read',
    'crm.schemas.orders.read',
    'crm.lists.read',
    'crm.objects.contacts.read',
    'crm.dealsplits.read_write',
    'crm.schemas.subscriptions.read',
    'crm.schemas.commercepayments.read',
    'crm.objects.owners.read',
    'crm.schemas.invoices.read',
    'crm.objects.marketing_events.read',
    'crm.schemas.services.read',
    'crm.schemas.courses.read',
    'crm.schemas.listings.read',
    'crm.schemas.appointments.read',
    'crm.schemas.carts.read',
    'business-intelligence',
    'behavioral_events.event_definitions.read_write'
  ];
  
  // Define direct Apollo mutations
  const [registerExternalCredentials, { loading, error, data }] = useMutation(REGISTER_EXTERNAL_CREDENTIALS);
  const [deleteExternalCredentials, { loading: deleteLoading, error: deleteError, data: deleteData }] = useMutation(DELETE_EXTERNAL_CREDENTIALS);

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Function to extract code from the URL and then clear the URL parameters
  const extractCodeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeValue = urlParams.get('code');
      if (codeValue && !code) { // Only set if we don't already have a code
        setCode(codeValue);
        // Clear the URL parameters after extracting them
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  };

  useEffect(() => {
    // Extract code when the component mounts
    extractCodeFromUrl();
  }, []);

  // Effect to trigger GraphQL call when code is updated
  useEffect(() => {
    if (code && workspaceSlug && !isProcessingCode) {
      setIsProcessingCode(true);
      setIsLoadingTokens(true);
      console.log("Registering credentials with code:", code);

      registerExternalCredentials({
        variables: {
          workspaceSlug,
          code,
          service,
          scope: [...requiredScopes, ...optionalScopes].join(' ')
        }
      }).catch(error => {
        console.error("Error registering credentials:", error);
        toast.error(`Failed to register credentials: ${error.message}`);
        setIsLoadingTokens(false);
        setIsProcessingCode(false);
      });
    }
  }, [code, workspaceSlug, service]);
  
  // Update the 'tokens' state with the 'remainingTokens' data
  useEffect(() => {
    if (data?.registerExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from registration:", data.registerExternalCredentials.remainingTokens);
      setTokens(data.registerExternalCredentials.remainingTokens);
      setIsLoadingTokens(false);
      setIsProcessingCode(false);
      // Clear the code to prevent re-processing
      setCode(null);
      toast.success('HubSpot account added successfully');
    }
  }, [data]);

  // Update the 'tokens' state with the 'remainingTokens' data from deleteExternalCredentials
  useEffect(() => {
    if (deleteData?.deleteExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from deletion:", deleteData.deleteExternalCredentials.remainingTokens);
      setTokens(deleteData.deleteExternalCredentials.remainingTokens);
    }
  }, [deleteData]);

  // Handle mutation error
  useEffect(() => {
    if (error) {
      console.error("Mutation error:", error);
      toast.error(`Error: ${error.message}`);
      setIsLoadingTokens(false);
      setIsProcessingCode(false);
      // Clear the code to prevent re-processing
      setCode(null);
    }
  }, [error]);

  // Function to fetch tokens
  const fetchTokens = async () => {
    if (hasHydrated && workspaceSlug) {
      setIsLoadingTokens(true);
      
      try {
        const result = await executeQuery(
          graphqlClient,
          GET_HUBSPOT_TOKENS,
          {
            workspaceSlug,
            service
          }
        );
        
        console.log("Fetched tokens:", result);
        
        if (result.data?.tokens) {
          setTokens(result.data.tokens);
        } else if (result.error) {
          console.error("Error fetching tokens:", result.error);
          toast.error(`Failed to load tokens: ${result.error.message}`);
        }
      } catch (error) {
        console.error("GraphQL tokens query failure:", error);
        toast.error(`GraphQL error: ${error.message}`);
      } finally {
        setIsLoadingTokens(false);
      }
    }
  };
  
  // Fetch tokens when the component mounts
  useEffect(() => {
    fetchTokens();
  }, [hasHydrated, workspaceSlug, service]);

  // Handle token deletion
  const handleDeleteToken = async (tokenId) => {
    try {
      console.log("Deleting token:", tokenId);
      
      // Optimistically update UI by removing the token from state
      setTokens(tokens.filter(token => token._id !== tokenId));
      
      // Reset selected token if it was deleted
      if (selectedTokenId === tokenId) {
        setSelectedTokenId(null);
      }
      
      // Execute the delete mutation
      deleteExternalCredentials({
        variables: {
          deleteExternalCredentialsId: tokenId,
          workspaceSlug
        }
      }).then(result => {
        if (result.data?.deleteExternalCredentials?.remainingTokens) {
          console.log("Token deleted successfully, remaining tokens:", 
            result.data.deleteExternalCredentials.remainingTokens);
          toast.success('Account removed successfully');
        }
      }).catch(error => {
        console.error("Error deleting token:", error);
        toast.error(`Failed to delete token: ${error.message}`);
        
        // If there was an error, re-fetch tokens to ensure UI is in sync
        fetchTokens();
      });
    } catch (error) {
      console.error("Error in handleDeleteToken:", error);
      toast.error(`Error: ${error.message}`);
    }
  };

  // Handle token refresh - redirect to OAuth flow
  const handleRefreshToken = async (tokenId) => {
    try {
      console.log("Refreshing token:", tokenId);
      toast.loading('Redirecting to HubSpot authorization...');
      
      // Redirect to OAuth authorization URL to reauthorize with fresh scopes
      const authUrl = await getHubspotAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error("Error in handleRefreshToken:", error);
      toast.error(`Failed to redirect to authorization: ${error.message}`);
    }
  };

  // Check if token has all required scopes
  const hasRequiredScopes = (token) => {
    if (!token.scopes || !Array.isArray(token.scopes)) return false;
    return requiredScopes.every(scope => token.scopes.includes(scope));
  };

  // Handle token selection
  const handleTokenSelect = (tokenId) => {
    setSelectedTokenId(tokenId);
  };

  // Navigation functions
  const handleContinue = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle source name change
  const handleSourceNameChange = (e) => {
    setSourceName(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmittingState(true);
    
    try {
      // Create batch config object
      const batchConfig = {
        batchJob: "hubspotSource",
        batchFrequency: "batch",
        backfillData: true,
        syncContacts,
        syncCompanies,
        syncDeals
      };
      
      // Execute mutation to create source
      const createResult = await executeMutation(
        graphqlClient,
        CREATE_SOURCE,
        {
          name: sourceName,
          sourceType: "hubspot",
          matchingField: "email", // Default matching field for HubSpot
          tokenId: selectedTokenId,
          workspaceSlug,
          batchConfig
        }
      );
      
      if (createResult.error) {
        console.error("GraphQL errors:", createResult.error);
        throw new Error("Failed to create source");
      }
      
      const sourceId = createResult.data.createSource._id;
      console.log("Source created:", sourceId);

      // Schedule the jobs using the new source ID
      const scheduleResult = await executeMutation(
        graphqlClient,
        SCHEDULE_JOBS,
        {
          workspaceSlug,
          jobs: [ 
            // Job 1: Immediate backfill job
            {
              name: "hubspotSource",
              schedule: "now", 
              data: {
                sourceId: sourceId,
                workspaceId: workspace.id,
                backfill: true
              }, 
            },
            // Job 2: Regular batch job
            {
              name: "hubspotSource",
              schedule: "every 1 hour",
              data: {
                sourceId: sourceId,
                workspaceId: workspace.id,
                backfill: false
              }
            }
          ]
        }
      );
      
      console.log("Jobs scheduled:", scheduleResult.data.scheduleJobs);
      
      // Show success messages
      toast.success('Source created successfully!', { duration: 5000 });
      toast.success(
        'Data is now being synchronized from HubSpot. Initial sync is running in the background.',
        { 
          duration: 8000,
          icon: '🔄'
        }
      );
      
      // Redirect to sources page after a short delay
      setTimeout(() => {
        window.location.href = `/${workspaceSlug}/sources`;
      }, 3000);
      
    } catch (error) {
      console.error("Error creating source:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  // Function to get HubSpot OAuth URL
  const getHubspotAuthUrl = () => {
    // Fetch the clientId from server
    return fetch(`/api/hubspot-client-id`)
      .then(response => response.json())
      .then(data => {
        const hubspotClientId = data.clientId;
        const redirectUri = `${window.location.origin}/api/callback/sources/add/hubspot`;
        const currentUrl = `${window.location.origin}/${workspaceSlug}/sources/add/hubspot`;
        
        const params = new URLSearchParams({
          client_id: hubspotClientId,
          redirect_uri: redirectUri,
          scope: requiredScopes.join(' '),
          optional_scope: optionalScopes.join(' '),
          state: currentUrl
        });
        
        window.location.href = `https://app.hubspot.com/oauth/authorize?${params.toString()}`;
      })
      .catch(error => {
        console.error("Error fetching HubSpot client ID:", error);
        toast.error("Failed to get HubSpot authorization URL");
      });
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`Outrun - ${workspace?.name || 'Dashboard'} | ${t("sources.add.hubspot.title") || "Add HubSpot Source"}`} />
      <Content.Title
        title={t("sources.add.hubspot.title") || "Add HubSpot Source"}
        subtitle={t("sources.add.hubspot.subtitle") || "Connect your HubSpot CRM data"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("sources.add.hubspot.step1.title") || "1. Select HubSpot Account"}
              subtitle={t("sources.add.hubspot.step1.subtitle") || "Choose an existing connection or add a new one"}
            >
              {tokens && tokens.length > 0 ? (
                <table className="table-fixed">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left"></th>
                      <th className="py-3 text-left">{t("sources.add.hubspot.accountEmail") || "Account email"}</th>
                      <th className="py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {tokens.map((token) => (
                      <tr 
                        key={token._id}
                        onMouseEnter={() => setHoveredTokenId(token._id)}
                        onMouseLeave={() => setHoveredTokenId(null)}
                      >
                        <td className="py-5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={selectedTokenId === token._id}
                            onChange={() => handleTokenSelect(token._id)}
                          />
                        </td>
                        <td className="py-5">
                          <div className="flex flex-row items-center justify-start space-x-3">
                            <div className="flex flex-col">
                              <h3 className="font-bold">{token.displayName || token.email}</h3>
                              {token.email && token.email !== token.displayName && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{token.email}</p>
                              )}
                              {!hasRequiredScopes(token) && (
                                <p className="text-xs text-amber-500">
                                  {t('sources.add.hubspot.insufficientScopes') || 'Missing required scopes'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-row items-center justify-end space-x-3">
                            <button
                              onClick={() => handleRefreshToken(token._id)}
                              className={`text-sm transition-opacity duration-200 ${
                                !hasRequiredScopes(token) 
                                  ? 'text-red-600 hover:text-red-800 opacity-100' 
                                  : hoveredTokenId === token._id 
                                    ? 'text-blue-600 hover:text-blue-800 opacity-100' 
                                    : 'text-blue-600 opacity-0 pointer-events-none'
                              }`}
                            >
                              {t('sources.add.hubspot.reauthorise') || 'Reauthorise'}
                            </button>
                            {token.errorMessages?.length > 0 && (
                              <span className="font-mono text-xs px-2 py-0.5 capitalize bg-red-200 text-red-600">
                                {token.errorMessages[0]}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteToken(token._id)}
                              className="text-red-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {isLoadingTokens && (
                      <tr>
                        <td colSpan={3} className="py-5">
                          <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2.5"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 font-bold text-light">
                  {t('sources.add.hubspot.noAccounts') || 'No HubSpot accounts connected yet. Add your first account below.'}
                </p>
              )}
              <div className="mt-4">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={getHubspotAuthUrl}
                >
                  {t('sources.add.hubspot.addAccount') || 'Add HubSpot Account'}
                </Button>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                background="Gray"
                border="Light"
                onClick={() => window.location.href = `/${workspaceSlug}/sources/add`}
              >
                {t("common.action.back") || "Back"}
              </Button>
              <Button
                background="Pink"
                border="Light"
                disabled={!selectedTokenId}
                onClick={handleContinue}
              >
                {t("common.action.continue") || "Continue"}
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 2: Configure Source */}
        {currentStep === 2 && (
          <Card>
            <Card.Body
              title={t("sources.add.hubspot.step2.title") || "2. Configure Source"}
              subtitle={t("sources.add.hubspot.step2.subtitle") || "Set up your HubSpot source"}
            >
              <div className="space-y-6">
                {/* Source Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("sources.add.hubspot.step2.name") || "Source Name"}
                  </label>
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder="Enter source name"
                    value={sourceName}
                    onChange={handleSourceNameChange}
                  />
                </div>
                

              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                background="Gray"
                border="Light"
                onClick={handleBack}
              >
                {t("common.action.back") || "Back"}
              </Button>
              <Button
                background="Pink"
                border="Light"
                disabled={!sourceName || isSubmitting}
                onClick={handleContinue}
              >
                {t("common.action.continue") || "Continue"}
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 3: Review & Confirm */}
        {currentStep === 3 && (
          <Card>
            <Card.Body
              title={t("sources.add.hubspot.step3.title") || "3. Review & Confirm"}
              subtitle={t("sources.add.hubspot.step3.subtitle") || "Review your source details"}
            >
              <div className="space-y-4">
                {/* Selected Account */}
                {tokens.find(token => token._id === selectedTokenId)?.email && (
                  <p className="mt-4">
                    <span className="font-bold">{t("sources.add.hubspot.step3.account") || "Account:"}</span> {tokens.find(token => token._id === selectedTokenId)?.email}
                  </p>
                )}
                
                {/* Source Name */}
                <p className="mt-2">
                  <span className="font-bold">{t("sources.add.hubspot.step3.name") || "Source Name:"}</span> {sourceName}
                </p>
                

                
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {t("sources.add.hubspot.step3.warning") || "This will create a new source and begin syncing your data from HubSpot."}
                </p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                background="Gray"
                border="Light"
                onClick={handleBack}
              >
                {t("common.action.back") || "Back"}
              </Button>
              <Button
                background="Pink"
                border="Light"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <span>{t("common.action.creating") || "Creating..."}</span>
                ) : (
                  <span>{t("common.action.createSource") || "Create Source"}</span>
                )}
              </Button>
            </Card.Footer>
          </Card>
        )}
      </Content.Container>
    </AccountLayout>
  );
}