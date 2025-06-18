'use client';

import { useState, useEffect, Fragment, use } from 'react';
import toast from 'react-hot-toast';
import '../../../../i18n'; // Import i18n initialization

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
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { useSession } from 'next-auth/react';
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



const CREATE_DESTINATION = gql`
  mutation CreateDestination(
    $name: String!, 
    $destinationType: String!, 
    $targetSystem: String!, 
    $tokenId: String, 
    $workspaceSlug: String, 
    $rateLimits: RateLimitsInput,
    $mappings: DestinationMappingsInput
  ) {
    createDestination(
      name: $name, 
      destinationType: $destinationType, 
      targetSystem: $targetSystem, 
      tokenId: $tokenId, 
      workspaceSlug: $workspaceSlug, 
      rateLimits: $rateLimits,
      mappings: $mappings
    ) {
      _id
    }
  }
`;

export default function HubSpotDestinationPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { data: session } = useSession();
  
  // GraphQL client state
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
  
  // People mapping fields
  const [peopleEnabled, setPeopleEnabled] = useState(true);
  const [peopleFields, setPeopleFields] = useState([
    'email', 'firstname', 'lastname', 'phone', 'company'
  ]);
  
  // Organizations mapping fields
  const [organizationsEnabled, setOrganizationsEnabled] = useState(true);
  const [organizationFields, setOrganizationFields] = useState([
    'name', 'domain', 'phone', 'industry'
  ]);
  
  // Rate limits
  const [requestsPerInterval, setRequestsPerInterval] = useState(100);
  const [intervalMs, setIntervalMs] = useState(60000); // 1 minute
  
  // Required scopes array definition
  const requiredScopes = [
    'tickets',
    'crm.schemas.deals.read',
    'e-commerce',
    'oauth',
    'crm.schemas.contacts.read',
    'crm.schemas.companies.read'
  ];
  
  // Optional scopes array definition
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
  
  // Define direct Apollo mutations like in the sources implementation
  const [registerExternalCredentials, { loading, error, data }] = useMutation(REGISTER_EXTERNAL_CREDENTIALS);
  
  const [deleteExternalCredentials, { loading: deleteLoading, error: deleteError, data: deleteData }] = useMutation(DELETE_EXTERNAL_CREDENTIALS);
  


  // Update the 'tokens' state with the 'remainingTokens' data from deleteExternalCredentials
  useEffect(() => {
    if (deleteData?.deleteExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from deletion:", deleteData.deleteExternalCredentials.remainingTokens);
      setTokens(deleteData.deleteExternalCredentials.remainingTokens);
    }
  }, [deleteData]);
  


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
        },
        context: {
          // Auth headers will be handled by Apollo link
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

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Function to extract code from the URL and then clear the URL parameters
  const extractCodeFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeValue = urlParams.get('code');
      if (codeValue) {
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

  // Effect to trigger GraphQL call when code is updated - match sources implementation
  useEffect(() => {
    if (code && workspaceSlug) {
      setIsLoadingTokens(true);
      console.log("Registering credentials with code:", code);

      registerExternalCredentials({
        variables: {
          workspaceSlug,
          code,
          service,
          scope: [...requiredScopes, ...optionalScopes].join(' ') // Pass all scopes directly
        },
        context: {
          // Get token from API for auth
          headers: {
            // This will be set by Apollo auth link
          }
        }
      }).catch(error => {
        console.error("Error registering credentials:", error);
        toast.error(`Failed to register credentials: ${error.message}`);
        setIsLoadingTokens(false);
      });
      
      // We don't need to manually clear the URL parameters here as it's done in extractCodeFromUrl
    }
  }, [code, workspaceSlug, service]);
  
  // Update the 'tokens' state with the 'remainingTokens' data
  useEffect(() => {
    if (data?.registerExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from registration:", data.registerExternalCredentials.remainingTokens);
      setTokens(data.registerExternalCredentials.remainingTokens);
      setIsLoadingTokens(false); // Set loading indicator to false after data is received
      toast.success('HubSpot account added successfully');
    }
  }, [data]);

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
      // Create mappings object
      const mappings = {
        people: {
          enabled: peopleEnabled,
          fields: peopleFields
        },
        organizations: {
          enabled: organizationsEnabled,
          fields: organizationFields
        }
      };
      
      // Create rateLimits object
      const rateLimits = {
        requestsPerInterval: parseInt(requestsPerInterval),
        intervalMs: parseInt(intervalMs)
      };
      
      // Execute mutation to create destination
      const result = await executeMutation(
        graphqlClient,
        CREATE_DESTINATION,
        {
          name: sourceName,
          destinationType: "hubspot",
          targetSystem: "Hubspot",
          tokenId: selectedTokenId,
          workspaceSlug,
          rateLimits,
          mappings
        }
      );
      
      if (result.data?.createDestination) {
        // Show more detailed success message about sync
        toast.success('Destination created successfully!', { duration: 5000 });
        
        // Show an additional toast about syncing
        toast.success(
          'Records are now being synchronized to HubSpot. Initial sync is running in the background, and future updates will be synchronized automatically.',
          { 
            duration: 8000,
            icon: '🔄'
          }
        );
        
        // Redirect to destinations page after a short delay to allow user to see the messages
        setTimeout(() => {
          window.location.href = `/${workspaceSlug}/destinations`;
        }, 3000);
      } else if (result.error) {
        console.error("Error creating destination:", result.error);
        toast.error(`Failed to create destination: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Error creating destination:", error);
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
        const redirectUri = `${window.location.origin}/api/callback/destinations/add/hubspot`;
        const currentUrl = `${window.location.origin}/${workspaceSlug}/destinations/add/hubspot`;
        
        // Required scopes - matching the working implementation
        const requiredScopes = [
          'tickets',
          'e-commerce', 
          'crm.schemas.deals.read',
          'oauth',
          'crm.schemas.contacts.read',
          'crm.schemas.companies.read'
        ];
        
        // Optional scopes - matching the working implementation
        const optionalScopes = [
          'crm.schemas.quotes.read',
          'crm.objects.carts.read',
          'crm.schemas.line_items.read',
          'crm.pipelines.orders.read',
          'crm.schemas.orders.read',
          'business-intelligence',
          'crm.objects.orders.read',
          'crm.objects.leads.read',
          'crm.objects.partner-clients.read',
          'crm.objects.feedback_submissions.read',
          'sales-email-read',
          'crm.objects.goals.read',
          'crm.objects.companies.read',
          'crm.lists.read',
          'crm.objects.contacts.read',
          'behavioral_events.event_definitions.read_write',
          'crm.dealsplits.read_write',
          'crm.objects.subscriptions.read',
          'crm.schemas.subscriptions.read',
          'crm.schemas.commercepayments.read',
          'crm.objects.owners.read',
          'crm.objects.commercepayments.read',
          'crm.objects.invoices.read',
          'crm.schemas.invoices.read',
          'crm.objects.courses.read',
          'crm.objects.listings.read',
          'crm.objects.services.read',
          'crm.objects.users.read',
          'crm.objects.contacts.write',
          'crm.objects.appointments.read',
          'crm.objects.marketing_events.read',
          'crm.schemas.custom.read',
          'crm.objects.custom.read',
          'crm.schemas.services.read',
          'crm.objects.companies.write',
          'crm.schemas.courses.read',
          'crm.schemas.listings.read',
          'crm.schemas.appointments.read',
          'crm.objects.quotes.read',
          'crm.schemas.carts.read'
        ];
        
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

  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  const toggleAdvancedSettings = () => {
    setAdvancedSettingsOpen(!advancedSettingsOpen);
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`Outrun - ${workspace?.name || 'Dashboard'} | ${t("destinations.add.hubspot.title") || "Add HubSpot Destination"}`} />
      <Content.Title
        title={t("destinations.add.hubspot.title") || "Add HubSpot Destination"}
        subtitle={t("destinations.add.hubspot.subtitle") || "Connect your data to HubSpot"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("destinations.add.hubspot.step1.title") || "1. Select HubSpot Account"}
              subtitle={t("destinations.add.hubspot.step1.subtitle") || "Choose an existing connection or add a new one"}
            >
              {tokens && tokens.length > 0 ? (
                <table className="table-fixed">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left"></th>
                      <th className="py-3 text-left">Account email</th>
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
                                  {t('destinations.add.hubspot.insufficientScopes') || 'Missing required scopes'}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex flex-row items-center justify-end space-x-3">
                            {/* Always reserve space for reauthorise button to prevent layout shift */}
                            <button
                              onClick={() => handleRefreshToken(token._id)}
                              className={`text-sm transition-opacity duration-200 ${
                                !hasRequiredScopes(token) 
                                  ? 'text-red-600 hover:text-red-800 opacity-100' 
                                  : hoveredTokenId === token._id 
                                    ? 'text-blue-600 hover:text-blue-800 opacity-100' 
                                    : 'text-blue-600 opacity-0 pointer-events-none'
                              }`}
                              disabled={false}
                            >
                              {t('destinations.add.hubspot.reauthorise') || 'Reauthorise'}
                            </button>
                            {token.errorMessages?.length > 0 && (
                              <span className="font-mono text-xs px-2 py-0.5-full capitalize bg-red-200 text-red-600">
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
                  {t('destinations.add.hubspot.noAccounts') || 'No HubSpot accounts connected yet. Add your first account below.'}
                </p>
              )}
              <div className="mt-4">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={getHubspotAuthUrl}
                >
                  {t('destinations.add.hubspot.addAccount') || 'Add HubSpot Account'}
                </Button>
              </div>
            </Card.Body>
            <Card.Footer>
              <div></div>
              <Button
                background="Pink"
                border="Light"
                disabled={!selectedTokenId}
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 2: Configure Destination */}
        {currentStep === 2 && (
          <Card>
            <Card.Body
              title={t("destinations.add.hubspot.step2.title") || "2. Configure Destination"}
              subtitle={t("destinations.add.hubspot.step2.subtitle") || "Set up your HubSpot destination"}
            >
              <div className="space-y-6">
                {/* Destination Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("destinations.add.hubspot.step2.name") || "Destination Name"}
                  </label>
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder="Enter destination name"
                    value={sourceName}
                    onChange={handleSourceNameChange}
                  />
                </div>
                
                {/* Advanced Settings Accordion */}
                <div className="rounded-md">
                  <button 
                    className="flex justify-between items-center w-full px-4 py-3 text-left"
                    onClick={toggleAdvancedSettings}
                  >
                    <span className="text-sm font-bold text-light">
                      {t("destinations.add.hubspot.step2.advancedSettings") || "Advanced Settings"}
                    </span>
                    <svg 
                      className={`w-5 h-5 transform ${advancedSettingsOpen ? 'rotate-180' : ''} transition-transform`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  
                  {advancedSettingsOpen && (
                    <div className="px-4 pb-4 space-y-6">
                      {/* People Mapping */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-light">
                          {t("destinations.add.hubspot.step2.peopleMappings") || "People Mappings"}
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={peopleEnabled}
                            onChange={(e) => setPeopleEnabled(e.target.checked)}
                          />
                          <span className="ml-2">
                            {t("destinations.add.hubspot.step2.enablePeople") || "Enable People Mapping"}
                          </span>
                        </div>
                        {peopleEnabled && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.hubspot.step2.peopleFieldsDescription") || "The following fields will be mapped to HubSpot contacts:"}
                            </p>
                            <ul className="list-disc pl-5 text-sm">
                              {peopleFields.map((field, index) => (
                                <li key={index}>{field}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Organizations Mapping */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-light">
                          {t("destinations.add.hubspot.step2.organizationMappings") || "Organization Mappings"}
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={organizationsEnabled}
                            onChange={(e) => setOrganizationsEnabled(e.target.checked)}
                          />
                          <span className="ml-2">
                            {t("destinations.add.hubspot.step2.enableOrganizations") || "Enable Organization Mapping"}
                          </span>
                        </div>
                        {organizationsEnabled && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.hubspot.step2.organizationFieldsDescription") || "The following fields will be mapped to HubSpot companies:"}
                            </p>
                            <ul className="list-disc pl-5 text-sm">
                              {organizationFields.map((field, index) => (
                                <li key={index}>{field}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      
                      {/* Rate Limits */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-light">
                          {t("destinations.add.hubspot.step2.rateLimits") || "Rate Limits"}
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.hubspot.step2.requestsPerInterval") || "Requests Per Interval"}
                            </label>
                            <input
                              className="w-full px-3 py-2 border-2 bg-dark mt-1"
                              type="number"
                              value={requestsPerInterval}
                              onChange={(e) => setRequestsPerInterval(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.hubspot.step2.intervalMs") || "Interval (ms)"}
                            </label>
                            <input
                              className="w-full px-3 py-2 border-2 bg-dark mt-1"
                              type="number"
                              value={intervalMs}
                              onChange={(e) => setIntervalMs(e.target.value)}
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("destinations.add.hubspot.step2.rateLimitsDescription") || "HubSpot's API limits: 100 requests per 10 seconds (recommended: 100 requests per 60000ms)"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                background="Gray"
                border="Light"
                onClick={handleBack}
              >
                <span>{t("common.action.back") || "Back"}</span>
              </Button>
              <Button
                background="Pink"
                border="Light"
                disabled={!sourceName || isSubmitting}
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 3: Review & Confirm */}
        {currentStep === 3 && (
          <Card>
            <Card.Body
              title={t("destinations.add.hubspot.step3.title") || "3. Review & Confirm"}
              subtitle={t("destinations.add.hubspot.step3.subtitle") || "Review your destination details"}
            >
              <div className="space-y-4">
                {/* Selected Account */}
                {tokens.find(token => token._id === selectedTokenId)?.email && (
                  <p className="mt-4">
                    <span className="font-bold">{t("destinations.add.hubspot.step3.account") || "Account:"}</span> {tokens.find(token => token._id === selectedTokenId)?.email}
                  </p>
                )}
                
                {/* Destination Name */}
                <p className="mt-2">
                  <span className="font-bold">{t("destinations.add.hubspot.step3.name") || "Destination Name:"}</span> {sourceName}
                </p>
                
                {/* Mappings */}
                <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.hubspot.step3.mappings") || "Mappings:"}</span>
                  <ul className="ml-4 mt-1 list-disc">
                    {peopleEnabled && (
                      <li>{t("destinations.add.hubspot.step3.peopleMappings") || "People to HubSpot Contacts"}</li>
                    )}
                    {organizationsEnabled && (
                      <li>{t("destinations.add.hubspot.step3.organizationMappings") || "Organizations to HubSpot Companies"}</li>
                    )}
                  </ul>
                </div>
                
                {/* Rate Limits */}
                <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.hubspot.step3.rateLimits") || "Rate Limits:"}</span>
                  <p className="ml-4">{requestsPerInterval} {t("destinations.add.hubspot.step3.requestsPer") || "requests per"} {intervalMs}ms</p>
                </div>
                
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {t("destinations.add.hubspot.step3.warning") || "This will create a new destination and begin syncing your data to HubSpot."}
                </p>
              </div>
            </Card.Body>
            <Card.Footer>
              <Button
                background="Gray"
                border="Light"
                onClick={handleBack}
              >
                <span>{t("common.action.back") || "Back"}</span>
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
                  <span>{t("common.action.create") || "Create Destination"}</span>
                )}
              </Button>
            </Card.Footer>
          </Card>
        )}
      </Content.Container>
    </AccountLayout>
  );
}