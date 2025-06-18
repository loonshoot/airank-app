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
import { XMarkIcon } from '@heroicons/react/24/outline';

// Define GraphQL queries and mutations
const GET_GOOGLE_TOKENS = gql`
  query GetGoogleTokens($workspaceSlug: String, $service: String) {
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

const GET_INTEGRATIONS = gql`
  query GetIntegrations($workspaceSlug: String, $tokenId: String, $appName: String) {
    integrations(workspaceSlug: $workspaceSlug, tokenId: $tokenId, appName: $appName) {
      name
      tenants {
        id
        name
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

export default function GoogleSearchConsolePage({ params }) {
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
  const [isProcessingCode, setIsProcessingCode] = useState(false);
  
  // OAuth and configuration state
  const [code, setCode] = useState(null);
  const [service, setService] = useState("google");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sourceName, setSourceName] = useState('Google Search Console');
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  
  // Step 2 state
  const [integrations, setIntegrations] = useState([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState([]);
  
  // Step 3 state - backfill configuration
  const [frequency, setFrequency] = useState('daily');
  const [backfillData, setBackfillData] = useState(false);
  const [backfillDate, setBackfillDate] = useState(new Date(Date.now() - (12 * 30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10));
  
  // Required scopes array definition
  const requiredScopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  // Define direct Apollo mutations
  const [registerExternalCredentials] = useMutation(REGISTER_EXTERNAL_CREDENTIALS);
  const [deleteExternalCredentials] = useMutation(DELETE_EXTERNAL_CREDENTIALS);

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
          scope: requiredScopes.join(' ')
        }
      }).then(result => {
        console.log("Registration result:", result);
        if (result.data?.registerExternalCredentials?.remainingTokens) {
          setTokens(result.data.registerExternalCredentials.remainingTokens);
          toast.success('Google account added successfully');
        }
        setIsLoadingTokens(false);
        setCode(null); // Clear code after processing
      }).catch(error => {
        console.error("Error registering credentials:", error);
        toast.error(`Failed to register credentials: ${error.message}`);
        setIsLoadingTokens(false);
        setCode(null); // Clear code after processing
      }).finally(() => {
        setIsProcessingCode(false);
      });
    }
  }, [code, workspaceSlug, service, registerExternalCredentials]);

  // Clear code if there's an error to prevent infinite loops
  useEffect(() => {
    if (code && !isProcessingCode) {
      const timer = setTimeout(() => {
        setCode(null);
      }, 5000); // Clear code after 5 seconds if not processed
      
      return () => clearTimeout(timer);
    }
  }, [code, isProcessingCode]);

  // Function to fetch tokens
  const fetchTokens = async () => {
    if (hasHydrated && workspaceSlug) {
      setIsLoadingTokens(true);
      
      try {
        const result = await executeQuery(
          graphqlClient,
          GET_GOOGLE_TOKENS,
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

  // Function to fetch integrations when token is selected
  const fetchIntegrations = async (tokenId) => {
    if (!tokenId) return;
    
    setIsLoadingIntegrations(true);
    try {
      const result = await executeQuery(
        graphqlClient,
        GET_INTEGRATIONS,
        {
          workspaceSlug,
          tokenId,
          appName: "google-search-console"
        }
      );
      
      console.log("Fetched integrations:", result);
      
      if (result.data?.integrations) {
        setIntegrations(result.data.integrations);
      } else if (result.error) {
        console.error("Error fetching integrations:", result.error);
        toast.error(`Failed to load sites: ${result.error.message}`);
      }
    } catch (error) {
      console.error("GraphQL integrations query failure:", error);
      toast.error(`GraphQL error: ${error.message}`);
    } finally {
      setIsLoadingIntegrations(false);
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
    setSelectedIntegrationIds([]); // Reset selected integrations
    fetchIntegrations(tokenId);
  };

  // Handle token deletion
  const handleDeleteToken = async (tokenId) => {
    try {
      const result = await deleteExternalCredentials({
        variables: {
          deleteExternalCredentialsId: tokenId,
          workspaceSlug
        }
      });
      
      if (result.data?.deleteExternalCredentials?.remainingTokens) {
        setTokens(result.data.deleteExternalCredentials.remainingTokens);
        toast.success('Account removed successfully');
        
        // Clear selection if deleted token was selected
        if (selectedTokenId === tokenId) {
          setSelectedTokenId(null);
          setSelectedIntegrationIds([]);
          setIntegrations([]);
        }
      }
    } catch (error) {
      console.error("Error deleting token:", error);
      toast.error(`Failed to remove account: ${error.message}`);
    }
  };

  // Handle token refresh - redirect to OAuth flow
  const handleRefreshToken = async (tokenId) => {
    try {
      console.log("Refreshing token:", tokenId);
      toast.loading('Redirecting to Google authorization...');
      
      // Redirect to OAuth authorization URL to reauthorize with fresh scopes
      const authUrl = getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error refreshing token:", error);
      toast.error(`Failed to redirect to authorization: ${error.message}`);
    }
  };

  // Handle integration selection
  const handleIntegrationSelect = (integrationId) => {
    if (selectedIntegrationIds.includes(integrationId)) {
      setSelectedIntegrationIds(selectedIntegrationIds.filter(id => id !== integrationId));
    } else {
      setSelectedIntegrationIds([...selectedIntegrationIds, integrationId]);
    }
  };

  // Navigation functions
  const handleContinue = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 2) {
      // Clear step 2 data when going back
      setSelectedTokenId(null);
      setSelectedIntegrationIds([]);
      setIntegrations([]);
    }
    setCurrentStep(currentStep - 1);
  };

  // Handle source name change
  const handleSourceNameChange = (e) => {
    setSourceName(e.target.value);
  };

  // Handle backfill configuration changes
  const handleFrequencyChange = (event) => {
    setFrequency(event.target.value);
  };

  const handleBackfillChange = (event) => {
    setBackfillData(event.target.checked);
  };

  const handleBackfillDateChange = (event) => {
    setBackfillDate(event.target.value);
  };

  // Handle form submission
  const handleSubmit = async () => {
    setSubmittingState(true);
    
    try {
      if (selectedIntegrationIds.length === 0) {
        throw new Error('Please select at least one site to sync');
      }

      // Create batchConfig object
      const batchConfig = {
        batchJob: "googleSearchConsoleSource",
        batchSites: selectedIntegrationIds.map(id => {
          const site = integrations?.[0]?.tenants?.find(t => t.id === id);
          return site?.name || id;
        }),
        batchFrequency: frequency,
        backfillDate: backfillData ? new Date(backfillDate).toISOString() : null
      };
      
      // Execute mutation to create source
      const result = await executeMutation(
        graphqlClient,
        CREATE_SOURCE,
        {
          name: sourceName,
          sourceType: "googleSearchConsole",
          matchingField: "domain",
          tokenId: selectedTokenId,
          workspaceSlug,
          batchConfig
        }
      );
      
      if (result.data?.createSource) {
        const newSourceId = result.data.createSource._id;
        
        // Schedule jobs
        const jobResult = await executeMutation(
          graphqlClient,
          SCHEDULE_JOBS,
          {
            workspaceSlug,
            jobs: [
              // Immediate backfill job
              {
                name: "googleSearchConsoleSource",
                schedule: "now",
                data: {
                  sourceId: newSourceId,
                  backfill: true
                }
              },
              // Regular batch job
              {
                name: "googleSearchConsoleSource",
                repeatEvery: "24 hours",
                skipImmediate: true,
                data: {
                  sourceId: newSourceId
                }
              }
            ]
          }
        );
        
        if (jobResult.data?.scheduleJobs) {
          toast.success('Source created successfully!', { duration: 5000 });
          
          // Show an additional toast about syncing
          toast.success(
            'Data is now being synchronized from Google Search Console. Initial sync is running in the background.',
            { 
              duration: 8000,
              icon: '🔄'
            }
          );
          
          // Redirect to sources page after a short delay
          setTimeout(() => {
            window.location.href = `/${workspaceSlug}/sources`;
          }, 3000);
        } else {
          throw new Error('Failed to schedule sync jobs');
        }
      } else if (result.error) {
        console.error("Error creating source:", result.error);
        toast.error(`Failed to create source: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Error creating source:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  // Function to get Google OAuth URL
  const getGoogleAuthUrl = () => {
    // Fetch the clientId from server
    return fetch(`/api/google-client-id`)
      .then(response => response.json())
      .then(data => {
        const googleClientId = data.clientId;
        const redirectUri = `${window.location.origin}/api/callback/sources/add/google-search-console`;
        const returnUrl = `${window.location.origin}/${workspaceSlug}/sources/add/google-search-console`;
        
        const params = new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: redirectUri,
          scope: requiredScopes.join(' '),
          response_type: 'code',
          access_type: 'offline',
          prompt: 'consent',
          state: returnUrl
        });
        
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      })
      .catch(error => {
        console.error("Error fetching Google client ID:", error);
        toast.error("Failed to get Google authorization URL");
      });
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`Outrun - ${workspace?.name || 'Dashboard'} | ${t("sources.add.gsc.title") || "Add Google Search Console Source"}`} />
      <Content.Title
        title={t("sources.add.gsc.title") || "Add Google Search Console Source"}
        subtitle={t("sources.add.gsc.subtitle") || "Track your website's search performance and visibility"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("sources.add.gsc.step1.title") || "1. Select Google Account"}
              subtitle={t("sources.add.gsc.step1.subtitle") || "Choose or add a Google account to connect"}
            >
              {/* Show table if tokens exist, otherwise show message */}
              {tokens?.length > 0 ? (
                <table className="table-fixed w-full">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left w-12"></th>
                      <th className="py-3 text-left">{t("sources.add.gsc.step1.accountEmail") || "Account email"}</th>
                      <th className="py-3 text-right w-32"></th>
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
                          <div className="flex flex-col">
                            <h3 className="font-bold">{token.email}</h3>
                            {!hasRequiredScopes(token) && (
                              <p className="text-xs text-amber-500">
                                {t('sources.add.gsc.insufficientScopes') || 'Missing required scopes'}
                              </p>
                            )}
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
                              {t('sources.add.gsc.reauthorise') || 'Reauthorise'}
                            </button>
                            {!hasRequiredScopes(token) && (
                              <span className='font-mono align-middle text-xs px-2 py-0.5 rounded-full capitalize bg-red-200 text-red-600'>
                                {t('errors.oauth.scopes.insufficient') || 'Insufficient scopes'}
                              </span>
                            )}
                            {token.errorMessages?.length > 0 && (
                              <span className='font-mono text-xs px-2 py-0.5 rounded-full capitalize bg-red-200 text-red-600'>
                                {t(token.errorMessages[0]) || token.errorMessages[0]}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteToken(token._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Loading skeleton */}
                    {isLoadingTokens && (
                      <tr>
                        <td className="py-5" colSpan="3">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-light animate-pulse rounded"></div>
                            <div className="w-1/3 h-4 bg-light animate-pulse rounded"></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 font-bold text-light">
                  {t('integration.message.addFirstAccount') || 'Add your first Google account to get started'}
                </p>
              )}
              
              <div className="mt-6">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={() => {
                    const authUrl = getGoogleAuthUrl();
                    // authUrl is a promise, so we don't set window.location.href here
                  }}
                >
                  {t("sources.add.gsc.step1.addAccount") || "Add account"}
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
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 2: Select Sites */}
        {currentStep === 2 && (
          <Card>
            <Card.Body
              title={t("sources.add.gsc.step2.title") || "2. Select Sites"}
              subtitle={t("sources.add.gsc.step2.subtitle") || "Choose which Search Console properties you want to sync data from"}
            >
              {integrations?.[0]?.tenants?.length > 0 || isLoadingIntegrations ? (
                <table className="table-fixed w-full">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left w-12"></th>
                      <th className="py-3 text-left">{t("sources.add.gsc.step2.siteName") || "Site Name"}</th>
                      <th className="py-3 text-right w-32"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {integrations?.[0]?.tenants?.map((tenant) => (
                      <tr key={tenant.id}>
                        <td className="py-5">
                          <input
                            type="checkbox"
                            className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                            checked={selectedIntegrationIds.includes(tenant.id)}
                            onChange={() => handleIntegrationSelect(tenant.id)}
                          />
                        </td>
                        <td className="py-5">
                          <div className="flex flex-col">
                            <h3 className="font-bold">{tenant.name}</h3>
                          </div>
                        </td>
                        <td className="py-3">
                          {/* Placeholder for future actions */}
                        </td>
                      </tr>
                    ))}
                    {/* Loading skeleton */}
                    {isLoadingIntegrations && (
                      <tr>
                        <td className="py-5" colSpan="3">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-light animate-pulse rounded"></div>
                            <div className="w-1/2 h-4 bg-light animate-pulse rounded"></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="mt-4 font-bold text-light">
                  {t('integration.message.noSitesFound') || 'No sites found for this account'}
                </p>
              )}
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
                disabled={selectedIntegrationIds.length === 0 || isLoadingIntegrations}
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
              title={t("sources.add.gsc.step3.title") || "3. Source Settings"}
              subtitle={t("sources.add.gsc.step3.subtitle") || "Configure your Google Search Console source"}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Source Name */}
                <div>
                  <label className="text-sm font-bold text-light">{t("sources.add.gsc.step3.sourceName") || "Source Name"}:</label>
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder={t("sources.add.gsc.step3.sourceNamePlaceholder") || "Enter source name"}
                    value={sourceName}
                    onChange={handleSourceNameChange}
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-sm font-bold text-light">{t("sources.add.gsc.step3.frequency") || "Frequency"}:</label>
                </div>
                <div className="col-span-2">
                  <div className="relative inline-block w-full border">
                    <select
                      className="w-full px-3 py-2 capitalize appearance-none bg-dark"
                      onChange={handleFrequencyChange}
                      value={frequency}
                    >
                      <option value="daily">{t("sources.add.gsc.step3.frequencyDaily") || "Daily"}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Backfill Data */}
                <div>
                  <label className="text-sm font-bold text-light">{t("sources.add.gsc.step3.backfillData") || "Backfill Historic Data"}:</label>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-row space-x-3">
                    <input
                      type="checkbox"
                      id="backfillData"
                      className="w-4 h-4 border-solid border-2 border-light accent-pink-600 align-middle"
                      checked={backfillData}
                      onChange={handleBackfillChange}
                    />
                    <label htmlFor="backfillData" className="text-sm font-bold text-light"></label>
                  </div>
                </div>

                {/* Backfill Date */}
                {backfillData && (
                  <>
                    <div>
                      <label className="text-sm font-bold text-light">{t("sources.add.gsc.step3.backfillDate") || "Backfill Date"}:</label>
                    </div>
                    <div className="col-span-2">
                      <input
                        className="w-full px-3 py-2 border-2 bg-dark"
                        type="date"
                        value={backfillDate}
                        onChange={handleBackfillDateChange}
                      />
                      <p className="py-2">{t("sources.modal.addsource.warning.backfill") || "Backfilling your data will kickoff an immediate job to sync your historic data."}</p>
                    </div>
                  </>
                )}
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
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* Step 4: Review and Create */}
        {currentStep === 4 && (
          <Card>
            <Card.Body
              title={t("sources.add.gsc.step4.title") || "4. Confirm Your Selection"}
              subtitle={t("sources.add.gsc.step4.subtitle") || "Please review the source configuration before saving"}
            >
              {/* Display selected account email */}
              {tokens.find(token => token._id === selectedTokenId)?.email && (
                <p className="mt-4">
                  <span className="font-bold">{t("sources.add.gsc.step4.account") || "Account"}:</span> {tokens.find(token => token._id === selectedTokenId)?.email}
                </p>
              )}
              {/* Display selected sites */}
              {selectedIntegrationIds.length > 0 && (
                <p className="mt-4">
                  <span className="font-bold">{t("sources.add.gsc.step4.sites") || "Sites"}:</span> 
                  {integrations?.[0]?.tenants?.filter(tenant => selectedIntegrationIds.includes(tenant.id)).map((tenant, index) => (
                    <span key={tenant.id}>
                      {index > 0 && ', '}
                      {tenant.name}
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-4">
                <span className="font-bold">{t("sources.add.gsc.step4.frequency") || "Frequency"}:</span> {frequency}
              </p>
              {backfillData && (
                <p className="mt-4">
                  <span className="font-bold">{t("sources.add.gsc.step4.backfillData") || "Backfill Data"}:</span> {t("sources.add.gsc.step4.backfillYes") || "Yes, until"} {backfillDate}
                </p>
              )}
              <p className="mt-4">
                <span className="font-bold">{t("sources.add.gsc.step4.sourceName") || "Source Name"}:</span> {sourceName}
              </p>
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
                disabled={isSubmitting || !sourceName.trim()}
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