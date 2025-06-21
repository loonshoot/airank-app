'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter } from 'next/navigation';
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
import { useSession } from 'next-auth/react';
import { gql } from '@apollo/client';
import { 
  executeQuery,
  executeMutation
} from '@/graphql/operations';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { use } from 'react';

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
  mutation RegisterExternalCredentials($workspaceSlug: String, $code: String!, $service: String!, $scope: String, $accountsServer: String) {
    registerExternalCredentials(workspaceSlug: $workspaceSlug, code: $code, service: $service, scope: $scope, accountsServer: $accountsServer) {
      message
      remainingTokens {
        _id
        email
        scopes
        errorMessages
        displayName
        externalId
        accountsServer
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
        accountsServer
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
        accountsServer
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

export default function ZohoCRMSourcePage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const router = useRouter();
  const { data: session } = useSession();
  const graphqlClient = useGraphQLClient();
  
  // State variables
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [code, setCode] = useState(null);
  const [accountsServer, setAccountsServer] = useState(null);
  const [service] = useState("zoho");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sourceName, setSourceName] = useState('Zoho CRM');
  const [frequency] = useState('batch');
  const [backfillData] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [registrationAttemptCount, setRegistrationAttemptCount] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  
  const MAX_REGISTRATION_ATTEMPTS = 2;
  
  // Required scopes array definition for Zoho
  const requiredScopes = [
    'ZohoCRM.modules.ALL',
    'ZohoCRM.settings.ALL',
    'offline_access'
  ];

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Function to extract code and accountsServer from the URL and then clear the URL parameters
  const extractParamsFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const codeValue = urlParams.get('code');
      const accountsServerValue = urlParams.get('accountsServer');
      
      if (codeValue) {
        setCode(codeValue);
      }
      if (accountsServerValue) {
        setAccountsServer(accountsServerValue);
      }
      
      if (codeValue || accountsServerValue) {
        // Clear the URL parameters after extracting them
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  };

  useEffect(() => {
    // Extract parameters when the component mounts
    extractParamsFromUrl();
  }, []);

  // Function to fetch tokens
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
  
  // Function to poll the tokens endpoint
  const pollTokens = useCallback(async () => {
    if (pollingCount >= 10) { // Limit to 10 attempts
      setIsPolling(false);
      return;
    }

    try {
      console.log(`Polling tokens (attempt ${pollingCount + 1})`);
      await fetchTokens();
      setPollingCount(prev => prev + 1);
    } catch (error) {
      console.error('Error polling tokens:', error);
      setPollingCount(prev => prev + 1);
    }
  }, [pollingCount]);
  
  // Add cleanup effect for polling
  useEffect(() => {
    let pollTimer;
    
    if (isPolling) {
      pollTimer = setTimeout(pollTokens, 1500);
    }
    
    // Cleanup function to clear timer
    return () => {
      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [isPolling, pollTokens, pollingCount]);

  // Effect to register credentials when code is available
  useEffect(() => {
    if (code && !isRegistering && registrationAttemptCount < MAX_REGISTRATION_ATTEMPTS && workspace) {
      setIsRegistering(true);
      const currentAttempt = registrationAttemptCount + 1;
      console.log(`Attempting to register credentials with code: ${code}, attempt #${currentAttempt}`);
      setIsLoadingTokens(true);

      executeMutation(graphqlClient, REGISTER_EXTERNAL_CREDENTIALS, {
        workspaceSlug,
        code,
        service,
        scope: requiredScopes.join(' '),
        accountsServer
      })
      .then(result => {
        console.log("Successfully registered external credentials:", result);
        if (result.data && result.data.registerExternalCredentials && result.data.registerExternalCredentials.remainingTokens) {
          setTokens(result.data.registerExternalCredentials.remainingTokens);
          toast.success('Zoho CRM account added successfully');
        }
        setIsPolling(true);
        setPollingCount(0);
        setCode(null);
        setAccountsServer(null);
        setRegistrationAttemptCount(0);
      })
      .catch(error => {
        console.error(`Error registering credentials on attempt #${currentAttempt}:`, error);
        toast.error(`Failed to register credentials: ${error.message}`);
        setRegistrationAttemptCount(prev => prev + 1);
      })
      .finally(() => {
        setIsRegistering(false);
        setIsLoadingTokens(false);
      });
    } else if (code && !isRegistering && registrationAttemptCount >= MAX_REGISTRATION_ATTEMPTS) {
      console.warn(`Max registration attempts (${MAX_REGISTRATION_ATTEMPTS}) reached for code: ${code}. Please try the OAuth flow again from the beginning.`);
      toast.error('Failed to connect to Zoho CRM after multiple attempts. Please try again.');
      setCode(null);
      setAccountsServer(null);
    }
  }, [code, isRegistering, registrationAttemptCount, workspace, workspaceSlug, service, graphqlClient, requiredScopes, accountsServer]);

  // Fetch tokens when the component mounts
  useEffect(() => {
    fetchTokens();
  }, [hasHydrated, workspaceSlug, service]);

  // Handle token selection
  const handleTokenSelect = (tokenId) => {
    setSelectedTokenId(tokenId);
  };

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
      const result = await executeMutation(
        graphqlClient,
        DELETE_EXTERNAL_CREDENTIALS,
        {
          deleteExternalCredentialsId: tokenId,
          workspaceSlug
        }
      );
      
      if (result.data?.deleteExternalCredentials?.remainingTokens) {
        console.log("Token deleted successfully, remaining tokens:", 
          result.data.deleteExternalCredentials.remainingTokens);
        toast.success('Account removed successfully');
      }
    } catch (error) {
      console.error("Error deleting token:", error);
      toast.error(`Failed to delete token: ${error.message}`);
      
      // If there was an error, re-fetch tokens to ensure UI is in sync
      fetchTokens();
    }
  };

  // Handle token refresh - redirect to OAuth flow
  const handleRefreshToken = async (tokenId) => {
    try {
      console.log("Refreshing token:", tokenId);
      toast.loading('Redirecting to Zoho CRM authorization...');
      
      // Redirect to OAuth authorization URL to reauthorize with fresh scopes
      await getZohoAuthUrl();
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

  // Navigation functions
  const handleContinue = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 2) { // Only clear on step 2
      setSelectedTokenId(null); // Clear selected token ID
    }
    setCurrentStep(currentStep - 1);
  };

  // Handle form field changes
  const handleSourceNameChange = (event) => {
    setSourceName(event.target.value);
  };

  // Function to get Zoho OAuth URL
  const getZohoAuthUrl = () => {
    // Fetch the clientId from server
    return fetch(`/api/zoho-client-id`)
      .then(response => response.json())
      .then(data => {
        const zohoClientId = data.clientId;
        const currentUrl = `${window.location.origin}/${workspaceSlug}/sources/add/zohocrm`;
        const redirectUri = `${window.location.origin}/api/callback/sources/add/zohocrm`;
        
        const params = new URLSearchParams({
          client_id: zohoClientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: `type=source&returnTo=${encodeURIComponent(currentUrl)}`,
          scope: requiredScopes.join(' '),
          access_type: 'offline'
        });
        
        window.location.href = `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
      })
      .catch(error => {
        console.error("Error fetching Zoho client ID:", error);
        toast.error("Failed to get Zoho authorization URL");
      });
  };

  // Handle Confirmation Step
  const handleConfirm = async () => {
    setIsSubmitting(true);
    
    try {
      // Construct the batchConfig object
      const batchConfig = {
        batchJob: "zohoSource",
        batchFrequency: frequency,
        backfillData: backfillData,
      };
    
      // Create the source using the mutation
      const createResult = await executeMutation(
        graphqlClient,
        CREATE_SOURCE,
        {
          name: sourceName,
          sourceType: "zohocrm",
          matchingField: "domain", 
          workspaceSlug,
          tokenId: selectedTokenId,
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
            // Job 1: Backfill
            {
              name: "zohoSource",
              schedule: "now", 
              data: {
                sourceId: sourceId,
                workspaceId: workspace.id,
                backfill: true
              }, 
            },
            // Job 2: Regular batch job
            {
              name: "zohoSource",
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
        'Records are now being synchronized from Zoho CRM. Initial sync is running in the background.',
        { 
          duration: 8000,
          icon: '🔄'
        }
      );
      
      // After successful creation and job scheduling, navigate to the sources page
      setTimeout(() => {
        router.push(`/${workspaceSlug}/sources`);
      }, 3000);
      
    } catch (error) {
      console.error("Error creating source:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("sources.add.title.zohocrm") || "Add Zoho CRM Source"}`} />
      <Content.Title
        title={t("sources.add.title") || "Add Source"}
        subtitle={t("sources.add.subtitle.zohocrm") || "Connect to Zoho CRM"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("sources.add.step1.title.zohocrm") || "1. Select Zoho CRM Account"}
              subtitle={t("sources.add.step1.subtitle") || "Choose an existing connection or add a new one"}
            >
              {tokens && tokens.length > 0 ? (
                <table className="table-fixed">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left"></th>
                      <th className="py-3 text-left">{t("sources.add.table.accountEmail") || "Account email"}</th>
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
                              <h3 className="font-bold">{token.displayName || token.email} - {token.email}</h3>
                              {!hasRequiredScopes(token) && (
                                <p className="text-xs text-amber-500">
                                  {t('sources.add.zohocrm.insufficientScopes') || 'Missing required scopes'}
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
                              {t('sources.add.zohocrm.reauthorise') || 'Reauthorise'}
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
                              <XMarkIcon className="w-5 h-5" />
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
                  {t('sources.add.zohocrm.addFirstAccount') || "Add your first Zoho CRM account below"}
                </p>
              )}
              <div className="mt-4">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={getZohoAuthUrl}
                >
                  {t('sources.add.zohocrm.addAccount') || 'Add Account'}
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
        
        {/* Step 2: Account Details */}
        {currentStep === 2 && (
          <Card>
            <Card.Body
              title={t("sources.add.step2.title") || "2. Account Details"}
              subtitle={t("sources.add.step2.subtitle") || "Review the connected account information"}
            >
              <table className="table-fixed">
                <thead className="text-light border-b">
                  <tr>
                    <th className="py-3 text-left">{t("common.organization") || "Organization"}</th>
                    <th className="py-3 text-left">{t("common.email") || "Email"}</th>
                    <th className="py-3 text-left">{t("sources.zohocrm.orgId") || "Org ID"}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {tokens?.filter(token => token._id === selectedTokenId).map((token) => (
                    <tr key={token._id}>
                      <td className="py-5">
                        <div className="flex flex-row items-center justify-start space-x-3">
                          <div className="flex flex-col">
                            <h3 className="font-bold">{token.displayName || t("common.notAvailable") || 'N/A'}</h3>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex flex-row items-center justify-start space-x-3">
                          <div className="flex flex-col">
                            <h3 className="font-bold">{token.email || t("common.notAvailable") || 'N/A'}</h3>
                          </div>
                        </div>
                      </td>
                      <td className="py-5">
                        <div className="flex flex-row items-center justify-start space-x-3">
                          <div className="flex flex-col">
                            <h3 className="font-bold">{token.externalId || t("common.notAvailable") || 'N/A'}</h3>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Body>
            <Card.Footer>
              <a 
                className="mb-4 inline-block text-light hover:text-green-600 cursor-pointer"
                onClick={handleBack}
              >
                <p>{t("common.action.back") || "< Back"}</p>
              </a>
              <Button
                background="Pink"
                border="Light"
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* Step 3: Source Settings */}
        {currentStep === 3 && (
          <Card>
            <Card.Body
              title={t("sources.add.step3.title") || "3. Source Settings"}
              subtitle={t("sources.add.step3.subtitle") || "Configure your Zoho CRM source"}
            >
              <div className="space-y-6">
                {/* Source Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">{t("sources.sourceName") || "Source Name"}:</label>
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder={t("sources.sourceName.placeholder") || "Enter source name"}
                    value={sourceName}
                    onChange={handleSourceNameChange}
                  />
                </div>

                {/* Information about backfill instead of checkbox */}
                <div className="space-y-2">
                  <p className="text-sm text-amber-500">
                    {t("sources.add.zohocrm.backfillInfo") || "All historical data will be imported from Zoho CRM."}
                  </p>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <a 
                className="mb-4 inline-block text-light hover:text-green-600 cursor-pointer"
                onClick={handleBack} 
              >
                <p>{t("common.action.back") || "< Back"}</p>
              </a>
              <Button
                background="Pink"
                border="Light"
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 4 && (
          <Card>
            <Card.Body
              title={t("sources.add.step4.title") || "4. Confirm Your Selection"}
              subtitle={t("sources.add.step4.subtitle") || "Please review the source configuration before saving"}
            >
              {/* Display selected account email */}
              {tokens.find(token => token._id === selectedTokenId)?.displayName && (
                <p className="mt-4">
                  <span className="font-bold">{t("common.account") || "Account"}:</span> {tokens.find(token => token._id === selectedTokenId)?.displayName}
                </p>
              )}
              
              <p className="mt-4">
                <span className="font-bold">{t("sources.sourceName") || "Source Name"}:</span> {sourceName}
              </p>
              
              <p className="mt-4">
                <span className="font-bold">{t("sources.backfill") || "Backfill"}:</span> {t("common.yes") || "Yes"}, {t("sources.backfillDescription") || "all historical data will be imported"}
              </p>
              
              <p className="mt-4 text-amber-500">
                {t("sources.modal.addsource.warning.backfill") || 
                  "The initial sync may take some time depending on the amount of data. You'll be able to track its progress in the source details page."}
              </p>
            </Card.Body>
            <Card.Footer>
              <a 
                className="mb-4 inline-block text-light hover:text-green-600 cursor-pointer"
                onClick={handleBack} 
              >
                <p>{t("common.action.back") || "< Back"}</p>
              </a>
              <Button
                background="Pink"
                border="Light"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 
                  <span>{t("common.processing") || "Processing..."}</span> : 
                  <span>{t("common.action.confirm") || "Confirm"}</span>
                }
              </Button>
            </Card.Footer>
          </Card>
        )}
      </Content.Container>
    </AccountLayout>
  );
}