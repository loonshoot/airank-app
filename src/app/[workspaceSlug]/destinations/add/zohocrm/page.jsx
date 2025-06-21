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
const GET_ZOHO_TOKENS = gql`
  query GetZohoTokens($workspaceSlug: String, $service: String) {
    tokens(workspaceSlug: $workspaceSlug, service: $service) {
      _id
      email
      scopes
      errorMessages
      displayName
      externalId
      accountsServer
    }
  }
`;

const REGISTER_EXTERNAL_CREDENTIALS = gql`
  mutation RegisterExternalCredentials($workspaceSlug: String, $code: String!, $service: String!, $scope: String, $accountsServer: String, $redirectUri: String) {
    registerExternalCredentials(workspaceSlug: $workspaceSlug, code: $code, service: $service, scope: $scope, accountsServer: $accountsServer, redirectUri: $redirectUri) {
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

const REFRESH_EXTERNAL_CREDENTIALS = gql`
  mutation RefreshExternalCredentials($tokenId: ID!, $workspaceSlug: String, $service: String!, $scope: String, $accountsServer: String, $redirectUri: String) {
    refreshExternalCredentials(tokenId: $tokenId, workspaceSlug: $workspaceSlug, service: $service, scope: $scope, accountsServer: $accountsServer, redirectUri: $redirectUri) {
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

export default function ZohoCRMDestinationPage({ params }) {
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
  const [service, setService] = useState("zoho");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sourceName, setSourceName] = useState('Zoho CRM');
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  
  // People mapping fields
  const [peopleEnabled, setPeopleEnabled] = useState(true);
  const [peopleFields, setPeopleFields] = useState([
    'First_Name', 'Last_Name', 'Email', 'Phone', 'Title'
  ]);
  
  // Organizations mapping fields
  const [organizationsEnabled, setOrganizationsEnabled] = useState(true);
  const [organizationFields, setOrganizationFields] = useState([
    'Account_Name', 'Website', 'Phone', 'Industry', 'Description'
  ]);
  
  // Rate limits
  const [requestsPerInterval, setRequestsPerInterval] = useState(60);
  const [intervalMs, setIntervalMs] = useState(60000); // 60 seconds for Zoho CRM
  
  // Required scopes array definition for Zoho CRM
  const requiredScopes = [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.ALL',
    'aaaserver.profile.READ'
  ];
  
  // Define direct Apollo mutations
  const [registerExternalCredentials, { loading, error, data }] = useMutation(REGISTER_EXTERNAL_CREDENTIALS);
  
  const [deleteExternalCredentials, { loading: deleteLoading, error: deleteError, data: deleteData }] = useMutation(DELETE_EXTERNAL_CREDENTIALS);
  
  const [refreshExternalCredentials, { loading: refreshLoading, error: refreshError, data: refreshData }] = useMutation(REFRESH_EXTERNAL_CREDENTIALS);
  
  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Function to extract code and other Zoho parameters from the URL and process immediately
  const checkOAuthCallback = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeValue = urlParams.get('code');
      const accountsServer = urlParams.get('accounts-server');
      const location = urlParams.get('location');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      // Clear URL parameters immediately to prevent reprocessing
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (error) {
        const errorMsg = errorDescription || `OAuth error: ${error}`;
        toast.error(errorMsg);
        console.error('OAuth callback error:', error, errorDescription);
        return;
      }
      
      if (codeValue && !isLoadingTokens) {
        setIsLoadingTokens(true);
        console.log('Processing OAuth code immediately...');
        
        const registerToken = async () => {
          try {
            const result = await executeMutation(
              graphqlClient,
              REGISTER_EXTERNAL_CREDENTIALS,
              {
                workspaceSlug,
                code: codeValue,
                service,
                scope: requiredScopes.join(','),
                accountsServer,
                redirectUri: `${window.location.origin}/api/callback/destinations/add/zohocrm`
              }
            );
            
            if (result.data?.registerExternalCredentials?.remainingTokens) {
              setTokens(result.data.registerExternalCredentials.remainingTokens);
              toast.success(result.data.registerExternalCredentials.message || 'Account connected successfully!');
            } else if (result.error) {
              console.error("Registration error:", result.error);
              toast.error(`Failed to register account: ${result.error.message}`);
            }
          } catch (error) {
            console.error("GraphQL registration failure:", error);
            toast.error(`Registration error: ${error.message}`);
          } finally {
            setIsLoadingTokens(false);
          }
        };
        
        registerToken();
      }
    }
  };

  useEffect(() => {
    // Check for OAuth callback results when the component mounts
    checkOAuthCallback();
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [hasHydrated, workspaceSlug]);

  const fetchTokens = async () => {
    if (hasHydrated && workspaceSlug) {
      setIsLoadingTokens(true);
      
      try {
        const result = await executeQuery(
          graphqlClient,
          GET_ZOHO_TOKENS,
          {
            workspaceSlug,
            service
          }
        );
        
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

  // Update the 'tokens' state with the 'remainingTokens' data from deleteExternalCredentials
  useEffect(() => {
    if (deleteData?.deleteExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from deletion:", deleteData.deleteExternalCredentials.remainingTokens);
      setTokens(deleteData.deleteExternalCredentials.remainingTokens);
    }
  }, [deleteData]);
  
  // Update the 'tokens' state with the 'remainingTokens' data from refreshExternalCredentials
  useEffect(() => {
    if (refreshData?.refreshExternalCredentials?.remainingTokens) {
      console.log("Setting tokens from refresh:", refreshData.refreshExternalCredentials.remainingTokens);
      setTokens(refreshData.refreshExternalCredentials.remainingTokens);
      toast.success('Zoho CRM account refreshed successfully');
    }
  }, [refreshData]);

  const handleTokenSelect = (tokenId) => {
    setSelectedTokenId(tokenId);
  };

  const handleDeleteToken = async (tokenId) => {
    if (window.confirm(t('destinations.add.zohocrm.deleteConfirm') || 'Are you sure you want to delete this Zoho CRM account?')) {
      try {
        const result = await executeMutation(
          graphqlClient,
          DELETE_EXTERNAL_CREDENTIALS,
          {
            deleteExternalCredentialsId: tokenId,
            workspaceSlug
          }
        );
        
        if (result.data?.deleteExternalCredentials?.remainingTokens) {
          setTokens(result.data.deleteExternalCredentials.remainingTokens);
          toast.success(result.data.deleteExternalCredentials.message || 'Account disconnected successfully!');
          
          // Clear selected token if it was deleted
          if (selectedTokenId === tokenId) {
            setSelectedTokenId(null);
          }
        } else if (result.error) {
          console.error("Delete error:", result.error);
          toast.error(`Failed to delete account: ${result.error.message}`);
        }
      } catch (error) {
        console.error("GraphQL delete failure:", error);
        toast.error(`Delete error: ${error.message}`);
      }
    }
  };

  // Handle token refresh - redirect to OAuth flow
  const handleRefreshToken = async (tokenId) => {
    try {
      console.log("Refreshing token:", tokenId);
      toast.loading('Redirecting to Zoho CRM authorization...');
      
      // Redirect to OAuth authorization URL to reauthorize with fresh scopes
      getZohoCRMAuthUrl();
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
  
  const handleContinue = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSourceNameChange = (e) => {
    setSourceName(e.target.value);
  };

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
          destinationType: "zohocrm",
          targetSystem: "Zoho CRM",
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
          'Records are now being synchronized to Zoho CRM. Initial sync is running in the background, and future updates will be synchronized automatically.',
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

  const getZohoCRMAuthUrl = () => {
    const clientId = process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/callback/destinations/add/zohocrm`;
    const scopes = requiredScopes.join(',');
    
    if (!clientId) {
      toast.error(t('destinations.add.zohocrm.notConfigured') || 'Zoho integration is not configured by the administrator.');
      return;
    }

    // Include state parameter for proper callback redirect
    const state = `/${workspaceSlug}/destinations/add/zohocrm`;
    
    const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodeURIComponent(scopes)}&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&access_type=offline&prompt=consent`;
    
    window.location.href = authUrl;
  };

  const toggleAdvancedSettings = () => {
    setAdvancedSettingsOpen(!advancedSettingsOpen);
  };
    
    return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("destinations.add.zohocrm.title") || "Add Zoho CRM Destination"}`} />
      <Content.Title
        title={t("destinations.add.zohocrm.title") || "Add Zoho CRM Destination"}
        subtitle={t("destinations.add.zohocrm.subtitle") || "Connect your data to Zoho CRM"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
          {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("destinations.add.zohocrm.step1.title") || "1. Select Zoho CRM Account"}
              subtitle={t("destinations.add.zohocrm.step1.subtitle") || "Choose an existing connection or add a new one"}
            >
              {tokens && tokens.length > 0 ? (
                <table className="table-fixed">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left"></th>
                      <th className="py-3 text-left">Organization</th>
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
                              {token.externalId && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Org ID: {token.externalId}</p>
                              )}
                              {!hasRequiredScopes(token) && (
                                <p className="text-xs text-amber-500">
                                  {t('destinations.add.zohocrm.insufficientScopes') || 'Missing required scopes'}
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
                              {t('destinations.add.zohocrm.reauthorise') || 'Reauthorise'}
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
                  {t('destinations.add.zohocrm.noAccounts') || 'No Zoho CRM accounts connected yet. Add your first account below.'}
                </p>
              )}
              <div className="mt-4">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={getZohoCRMAuthUrl}
                >
                  {t('destinations.add.zohocrm.addAccount') || 'Add Zoho CRM Account'}
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
              title={t("destinations.add.zohocrm.step2.title") || "2. Configure Destination"}
              subtitle={t("destinations.add.zohocrm.step2.subtitle") || "Set up your Zoho CRM destination"}
            >
              <div className="space-y-6">
                {/* Destination Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("destinations.add.zohocrm.step2.name") || "Destination Name"}
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
                      {t("destinations.add.zohocrm.step2.advancedSettings") || "Advanced Settings"}
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
                          {t("destinations.add.zohocrm.step2.peopleMappings") || "People Mappings"}
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={peopleEnabled}
                            onChange={(e) => setPeopleEnabled(e.target.checked)}
                          />
                          <span className="ml-2">
                            {t("destinations.add.zohocrm.step2.enablePeople") || "Enable People Mapping"}
                          </span>
                        </div>
                        {peopleEnabled && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.zohocrm.step2.peopleFieldsDescription") || "The following fields will be mapped to Zoho CRM contacts:"}
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
                          {t("destinations.add.zohocrm.step2.organizationMappings") || "Organization Mappings"}
                        </label>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={organizationsEnabled}
                            onChange={(e) => setOrganizationsEnabled(e.target.checked)}
                          />
                          <span className="ml-2">
                            {t("destinations.add.zohocrm.step2.enableOrganizations") || "Enable Organization Mapping"}
                          </span>
                        </div>
                        {organizationsEnabled && (
                          <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded">
                            <p className="mb-2 text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.zohocrm.step2.organizationFieldsDescription") || "The following fields will be mapped to Zoho CRM accounts:"}
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
                          {t("destinations.add.zohocrm.step2.rateLimits") || "Rate Limits"}
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-600 dark:text-gray-300">
                              {t("destinations.add.zohocrm.step2.requestsPerInterval") || "Requests Per Interval"}
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
                              {t("destinations.add.zohocrm.step2.intervalMs") || "Interval (ms)"}
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
                          {t("destinations.add.zohocrm.step2.rateLimitsDescription") || "Zoho CRM's API limits: 60 requests per 60 seconds (recommended setting)"}
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
              title={t("destinations.add.zohocrm.step3.title") || "3. Review & Confirm"}
              subtitle={t("destinations.add.zohocrm.step3.subtitle") || "Review your destination details"}
            >
              <div className="space-y-4">
                {/* Selected Account */}
                {tokens.find(token => token._id === selectedTokenId)?.displayName && (
                  <p className="mt-4">
                    <span className="font-bold">{t("destinations.add.zohocrm.step3.account") || "Organization:"}</span> {tokens.find(token => token._id === selectedTokenId)?.displayName}
                  </p>
                )}
                
                {/* Destination Name */}
                <p className="mt-2">
                  <span className="font-bold">{t("destinations.add.zohocrm.step3.name") || "Destination Name:"}</span> {sourceName}
                </p>
                
                {/* Mappings */}
                <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.zohocrm.step3.mappings") || "Mappings:"}</span>
                  <ul className="ml-4 mt-1 list-disc">
                    {peopleEnabled && (
                      <li>{t("destinations.add.zohocrm.step3.peopleMappings") || "People to Zoho CRM Contacts"}</li>
                    )}
                    {organizationsEnabled && (
                      <li>{t("destinations.add.zohocrm.step3.organizationMappings") || "Organizations to Zoho CRM Accounts"}</li>
                    )}
                  </ul>
                </div>
                
                {/* Rate Limits */}
                    <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.zohocrm.step3.rateLimits") || "Rate Limits:"}</span>
                  <p className="ml-4">{requestsPerInterval} {t("destinations.add.zohocrm.step3.requestsPer") || "requests per"} {intervalMs}ms</p>
                </div>
                
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {t("destinations.add.zohocrm.step3.warning") || "This will create a new destination and begin syncing your data to Zoho CRM."}
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