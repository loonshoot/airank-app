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
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Define GraphQL queries and mutations
const GET_ATLASSIAN_TOKENS = gql`
  query GetAtlassianTokens($workspaceSlug: String, $service: String) {
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
  mutation RegisterExternalCredentials($workspaceSlug: String, $code: String!, $service: String!) {
    registerExternalCredentials(workspaceSlug: $workspaceSlug, code: $code, service: $service) {
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

export default function ConfluencePage({ params }) {
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
  const [service, setService] = useState("atlassian");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [sourceName, setSourceName] = useState('Confluence Knowledge Base');
  const [hoveredTokenId, setHoveredTokenId] = useState(null);
  
  // Step 2 state
  const [integrations, setIntegrations] = useState([]);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(false);
  const [selectedIntegrationIds, setSelectedIntegrationIds] = useState([]);
  
  // Step 3 state - backfill configuration
  const [frequency, setFrequency] = useState('daily');
  
  // Required scopes array definition
  const requiredScopes = [
    'read:me',
    'offline_access',
    'readonly:content.attachment:confluence',
    'search:confluence',
    'read:confluence-content.summary',
    'read:confluence-content.all',
    'read:confluence-props',
    'read:confluence-space.summary'
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
      const errorParam = urlParams.get('error');

      if (errorParam) {
        console.error('Error during Atlassian auth:', errorParam);
        toast.error('Authentication failed');
        return;
      }

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
          service
        }
      }).then(result => {
        console.log("Registration result:", result);
        if (result.data?.registerExternalCredentials?.remainingTokens) {
          setTokens(result.data.registerExternalCredentials.remainingTokens);
          toast.success('Atlassian account added successfully');
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
          GET_ATLASSIAN_TOKENS,
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
          appName: "confluence"
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
      toast.loading('Redirecting to Atlassian authorization...');
      
      // Redirect to OAuth authorization URL to reauthorize with fresh scopes
      const authUrl = getAtlassianAuthUrl();
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

  // Handle form submission
  const handleSubmit = async () => {
    setSubmittingState(true);
    
    try {
      if (selectedIntegrationIds.length === 0) {
        throw new Error('Please select at least one site to sync');
      }

      // Get selected sites
      const selectedSites = integrations?.[0]?.tenants?.filter(t => selectedIntegrationIds.includes(t.id)) || [];
      
      if (selectedSites.length === 0) {
        throw new Error('No valid sites found');
      }

      const createdSources = [];
      const allJobs = [];

      // Create a separate source for each selected site
      for (const site of selectedSites) {
        const siteSourceName = selectedSites.length > 1 ? `${sourceName} - ${site.name}` : sourceName;
        
        // Create batchConfig for this specific site
        const batchConfig = {
          batchJob: "confluenceSource",
          cloudId: site.id, // Each site gets its own cloudId
          batchFrequency: frequency,
          backfillDate: null // Always backfill all data
        };
        
        // Execute mutation to create source for this site
        const result = await executeMutation(
          graphqlClient,
          CREATE_SOURCE,
          {
            name: siteSourceName,
            sourceType: "confluence",
            matchingField: "domain",
            tokenId: selectedTokenId,
            workspaceSlug,
            batchConfig
          }
        );
        
        if (result.data?.createSource) {
          const newSourceId = result.data.createSource._id;
          createdSources.push({ sourceId: newSourceId, siteName: site.name });
          
          // Add jobs for this source
          allJobs.push(
            // Immediate backfill job
            {
              name: "confluenceSource",
              schedule: "now",
              data: {
                sourceId: newSourceId,
                backfill: true
              }
            },
            // Regular batch job
            {
              name: "confluenceSource",
              repeatEvery: "24 hours",
              skipImmediate: true,
              data: {
                sourceId: newSourceId
              }
            }
          );
        } else if (result.error) {
          throw new Error(`Failed to create source for ${site.name}: ${result.error.message}`);
        }
      }

      // Schedule all jobs at once
      if (allJobs.length > 0) {
        const jobResult = await executeMutation(
          graphqlClient,
          SCHEDULE_JOBS,
          {
            workspaceSlug,
            jobs: allJobs
          }
        );
        
        if (jobResult.data?.scheduleJobs) {
          const sourceCount = createdSources.length;
          const siteNames = createdSources.map(s => s.siteName).join(', ');
          
          toast.success(`${sourceCount} source${sourceCount > 1 ? 's' : ''} created successfully!`, { duration: 5000 });
          
          // Show an additional toast about syncing
          toast.success(
            `Data is now being synchronized from ${sourceCount} Confluence site${sourceCount > 1 ? 's' : ''}: ${siteNames}. Initial sync is running in the background.`,
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
      }
    } catch (error) {
      console.error("Error creating sources:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  // Function to get Atlassian OAuth URL
  const getAtlassianAuthUrl = () => {
    // Fetch the clientId from server
    return fetch(`/api/atlassian-client-id`)
      .then(response => response.json())
      .then(data => {
        const atlassianClientId = data.clientId;
        const redirectUri = `${window.location.origin}/api/callback/sources/add/atlassian`;
        const returnUrl = `${window.location.origin}/${workspaceSlug}/sources/add/confluence`;
        
        const params = new URLSearchParams({
          audience: 'api.atlassian.com',
          client_id: atlassianClientId,
          scope: requiredScopes.join(' '),
          redirect_uri: redirectUri,
          state: returnUrl,
          response_type: 'code',
          prompt: 'consent'
        });
        
        window.location.href = `https://auth.atlassian.com/authorize?${params.toString()}`;
      })
      .catch(error => {
        console.error("Error fetching Atlassian client ID:", error);
        toast.error("Failed to get Atlassian authorization URL");
      });
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("sources.add.confluence.title") || "Add Confluence Source"}`} />
      <Content.Title
        title={t("sources.add.confluence.title") || "Add Confluence Source"}
        subtitle={t("sources.add.confluence.subtitle") || "Import your knowledge base content and documentation"}
      />
      <Content.Divider />
      <Content.Container>
        {/* Step 1: Select Account */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("sources.add.confluence.step1.title") || "1. Select Atlassian Account"}
              subtitle={t("sources.add.confluence.step1.subtitle") || "Choose or add an Atlassian account to connect"}
            >
              {/* Show table if tokens exist, otherwise show message */}
              {tokens?.length > 0 ? (
                <table className="table-fixed w-full">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left w-12"></th>
                      <th className="py-3 text-left">{t("sources.add.confluence.step1.accountEmail") || "Account email"}</th>
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
                                {t('sources.add.confluence.insufficientScopes') || 'Missing required scopes'}
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
                              {t('sources.add.confluence.reauthorise') || 'Reauthorise'}
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
                  {t('integration.message.addFirstAccount') || 'Add your first Atlassian account to get started'}
                </p>
              )}
              
              <div className="mt-6">
                <Button
                  background="Yellow"
                  border="Light"
                  onClick={() => {
                    const authUrl = getAtlassianAuthUrl();
                    // authUrl is a promise, so we don't set window.location.href here
                  }}
                >
                  {t("sources.add.confluence.step1.addAccount") || "Add account"}
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
              title={t("sources.add.confluence.step2.title") || "2. Select Confluence Sites"}
              subtitle={t("sources.add.confluence.step2.subtitle") || "Choose which Confluence sites you want to sync data from"}
            >
              {integrations?.[0]?.tenants?.length > 0 || isLoadingIntegrations ? (
                <table className="table-fixed w-full">
                  <thead className="text-light border-b">
                    <tr>
                      <th className="py-3 text-left w-12"></th>
                      <th className="py-3 text-left">{t("sources.add.confluence.step2.siteName") || "Site Name"}</th>
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
                  {t('integration.message.noSitesFound') || 'No Confluence sites found for this account'}
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
              title={t("sources.add.confluence.step3.title") || "3. Source Settings"}
              subtitle={t("sources.add.confluence.step3.subtitle") || "Configure your Confluence source"}
            >
              <div className="grid grid-cols-2 gap-4">
                {/* Source Name */}
                <div>
                  <label className="text-sm font-bold text-light">{t("sources.add.confluence.step3.sourceName") || "Source Name"}:</label>
                </div>
                <div className="col-span-2">
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder={t("sources.add.confluence.step3.sourceNamePlaceholder") || "Enter source name"}
                    value={sourceName}
                    onChange={handleSourceNameChange}
                  />
                </div>

                {/* Frequency */}
                <div>
                  <label className="text-sm font-bold text-light">{t("sources.add.confluence.step3.frequency") || "Frequency"}:</label>
                </div>
                <div className="col-span-2">
                  <div className="relative inline-block w-full border">
                    <select
                      className="w-full px-3 py-2 capitalize appearance-none bg-dark"
                      onChange={handleFrequencyChange}
                      value={frequency}
                    >
                      <option value="daily">{t("sources.add.confluence.step3.frequencyDaily") || "Daily"}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDownIcon className="w-5 h-5" />
                    </div>
                  </div>
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
              title={t("sources.add.confluence.step4.title") || "4. Confirm Your Selection"}
              subtitle={t("sources.add.confluence.step4.subtitle") || "Please review the source configuration before saving"}
            >
              {/* Display selected account email */}
              {tokens.find(token => token._id === selectedTokenId)?.email && (
                <p className="mt-4">
                  <span className="font-bold">{t("sources.add.confluence.step4.account") || "Account"}:</span> {tokens.find(token => token._id === selectedTokenId)?.email}
                </p>
              )}
              {/* Display selected sites */}
              {selectedIntegrationIds.length > 0 && (
                <p className="mt-4">
                  <span className="font-bold">{t("sources.add.confluence.step4.sites") || "Sites"}:</span> 
                  {integrations?.[0]?.tenants?.filter(tenant => selectedIntegrationIds.includes(tenant.id)).map((tenant, index) => (
                    <span key={tenant.id}>
                      {index > 0 && ', '}
                      {tenant.name}
                    </span>
                  ))}
                </p>
              )}
              <p className="mt-4">
                <span className="font-bold">{t("sources.add.confluence.step4.frequency") || "Frequency"}:</span> {frequency}
              </p>
              <p className="mt-4">
                <span className="font-bold">{t("sources.add.confluence.step4.sourceName") || "Source Name"}:</span> {sourceName}
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