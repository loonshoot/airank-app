'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../../../i18n';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { gql } from '@apollo/client';
import { executeMutation } from '@/graphql/operations';
import { useSession } from 'next-auth/react';

// GraphQL mutation for creating API key
const CREATE_API_KEY = gql`
  mutation CreateApiKey(
    $name: String!
    $permissions: [String!]!
    $allowedIps: [String!]
    $allowedDomains: [String!]
    $workspaceId: String!
  ) {
    createApiKey(
      name: $name
      permissions: $permissions
      allowedIps: $allowedIps
      allowedDomains: $allowedDomains
      workspaceId: $workspaceId
    ) {
      _id
      bearer
      name
      permissions
      allowedIps
      allowedDomains
      createdAt
    }
  }
`;

export default function McpDestinationPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const { data: session } = useSession();
  
  const graphqlClient = useGraphQLClient();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  
  // Configuration state
  const [destinationName, setDestinationName] = useState('MCP Data Access');
  const [allowedIps, setAllowedIps] = useState([]);
  const [ipInput, setIpInput] = useState('');
  
  // Generated configuration
  const [generatedApiKey, setGeneratedApiKey] = useState(null);
  const [copied, setCopied] = useState(false);

  // MCP permissions - fixed set
  const mcpPermissions = ['query:objects', 'query:workspaces', '/graphql:post'];

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Handle IP management
  const handleAddIp = () => {
    if (ipInput.trim() && !allowedIps.includes(ipInput.trim())) {
      setAllowedIps([...allowedIps, ipInput.trim()]);
      setIpInput('');
    }
  };

  const handleRemoveIp = (ip) => {
    setAllowedIps(allowedIps.filter(i => i !== ip));
  };



  // Navigation functions
  const handleContinue = () => {
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // Handle destination name change
  const handleDestinationNameChange = (e) => {
    setDestinationName(e.target.value);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!workspace?._id && !workspace?.id) {
      toast.error('Workspace not loaded. Please try again.');
      return;
    }
    
    setSubmittingState(true);
    
    try {
      const workspaceId = workspace._id || workspace.id;
      console.log('Creating API key with workspace ID:', workspaceId);
      
      const result = await executeMutation(
        graphqlClient,
        CREATE_API_KEY,
        {
          name: destinationName,
          permissions: mcpPermissions,
          allowedIps: allowedIps,
          allowedDomains: [],
          workspaceId: workspaceId
        }
      );

      console.log('Full mutation result:', result);
      console.log('GraphQL errors:', result.errors);
      console.log('Data:', result.data);
      
      if (result.data?.createApiKey) {
        setGeneratedApiKey(result.data.createApiKey);
        toast.success('MCP access token created successfully!');
        setCurrentStep(4);
      } else if (result.error) {
        console.error("Error creating API key:", result.error);
        toast.error(`Failed to create API key: ${result.error.message}`);
      } else if (result.errors && result.errors.length > 0) {
        console.error("GraphQL errors:", result.errors);
        toast.error(`GraphQL error: ${result.errors[0].message}`);
      } else {
        // Handle case where mutation succeeds but returns null
        console.error("API key creation returned null - likely permission issue");
        toast.error('Permission denied: You need the "mutation:createApiKey" permission to create API keys. Please contact your workspace administrator.');
      }
    } catch (error) {
      console.error("Error creating API key:", error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setSubmittingState(false);
    }
  };

  const getMcpConfiguration = () => {
    if (!generatedApiKey) return '';
    
    const config = {
      "mcpServers": {
        [`airank-${workspaceSlug}`]: {
          "command": "npx",
          "args": [
            "@modelcontextprotocol/server-fetch",
            `${window.location.origin}/api/v1/mcp`
          ],
          "env": {
            "OUTRUN_BEARER_TOKEN": generatedApiKey.bearer
          }
        }
      }
    };
    
    return JSON.stringify(config, null, 2);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getMcpConfiguration());
      setCopied(true);
      toast.success('Configuration copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("destinations.add.mcp.title") || "Add MCP Server"}`} />
      <Content.Title
        title={t("destinations.add.mcp.title") || "Add MCP Server"}
        subtitle={t("destinations.add.mcp.subtitle") || "Create Model Context Protocol server for AI access"}
      />
      <Content.Divider />
      <Content.Container>
        
        {/* Step 1: Configure Name */}
        {currentStep === 1 && (
          <Card>
            <Card.Body
              title={t("destinations.add.mcp.step1.title") || "1. Configure MCP Server"}
              subtitle={t("destinations.add.mcp.step1.subtitle") || "Set up your MCP server name and permissions"}
            >
              <div className="space-y-6">
                {/* Destination Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("destinations.add.mcp.step1.connectionName") || "Connection Name"}
                  </label>
                  <input
                    className="w-full px-3 py-2 border-2 bg-dark"
                    type="text"
                    placeholder="Enter connection name"
                    value={destinationName}
                    onChange={handleDestinationNameChange}
                  />
                </div>

                {/* Data Access Description */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900 rounded">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                    {t("destinations.add.mcp.step1.dataAccess") || "Data Access Permissions"}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    {t("destinations.add.mcp.step1.description") || "This destination will provide AI models with read-only access to objects in your database via the issued bearer token. Keep this token safe."}
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Read access to workspace objects and data</li>
                  </ul>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <div></div>
              <Button
                background="Pink"
                border="Light"
                disabled={!destinationName}
                onClick={handleContinue}
              >
                <span>{t("common.action.continue") || "Continue"}</span>
              </Button>
            </Card.Footer>
          </Card>
        )}

        {/* Step 2: Security Settings */}
        {currentStep === 2 && (
          <Card>
            <Card.Body
              title={t("destinations.add.mcp.step2.title") || "2. Security Settings"}
              subtitle={t("destinations.add.mcp.step2.subtitle") || "Configure optional IP restrictions"}
            >
              <div className="space-y-6">
                {/* IP Restrictions */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("destinations.add.mcp.step2.allowedIps") || "Allowed IP Addresses (Optional)"}
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t("destinations.add.mcp.step2.ipDescription") || "Restrict access to specific IP addresses. Leave empty to allow all IPs."}
                  </p>
                  <div className="flex space-x-2 mb-3">
                    <input
                      className="flex-1 px-3 py-2 border-2 bg-dark"
                      type="text"
                      value={ipInput}
                      onChange={(e) => setIpInput(e.target.value)}
                      placeholder="192.168.1.1"
                    />
                    <Button
                      background="Yellow"
                      border="Light"
                      onClick={handleAddIp}
                      disabled={!ipInput.trim()}
                    >
                      Add
                    </Button>
                  </div>
                  {allowedIps.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {allowedIps.map((ip) => (
                        <span
                          key={ip}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {ip}
                          <button
                            type="button"
                            onClick={() => handleRemoveIp(ip)}
                            className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                          >
                            ×
                          </button>
                        </span>
                      ))}
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
              title={t("destinations.add.mcp.step3.title") || "3. Review & Confirm"}
              subtitle={t("destinations.add.mcp.step3.subtitle") || "Review your MCP server configuration"}
            >
              <div className="space-y-4">
                {/* Connection Name */}
                <p className="mt-4">
                  <span className="font-bold">{t("destinations.add.mcp.step3.connectionName") || "Connection Name:"}</span> {destinationName}
                </p>
                
                {/* Permissions */}
                <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.mcp.step3.permissions") || "Permissions:"}</span>
                  <ul className="ml-4 mt-1 list-disc">
                    <li>Read access to workspace objects and data</li>
                  </ul>
                </div>
                
                {/* IP Restrictions */}
                <div className="mt-2">
                  <span className="font-bold">{t("destinations.add.mcp.step3.ipRestrictions") || "IP Restrictions:"}</span>
                  {allowedIps.length > 0 ? (
                    <ul className="ml-4 mt-1 list-disc">
                      {allowedIps.map((ip, index) => (
                        <li key={index}>{ip}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ml-4 text-gray-600 dark:text-gray-400">No IP restrictions (all IPs allowed)</p>
                  )}
                </div>
                
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {t("destinations.add.mcp.step3.warning") || "This will create a new MCP server and generate an access token for AI models to access your workspace data."}
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
                disabled={isSubmitting || (!workspace?._id && !workspace?.id)}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <span>{t("common.status.processing") || "Creating..."}</span>
                ) : (
                  <span>{t("common.action.createDestination") || "Create MCP Server"}</span>
                )}
              </Button>
            </Card.Footer>
          </Card>
        )}
        
        {/* Step 4: Configuration Generated */}
        {currentStep === 4 && generatedApiKey && (
          <Card>
            <Card.Body
              title={t("destinations.add.mcp.step4.title") || "4. MCP Configuration Ready"}
              subtitle={t("destinations.add.mcp.step4.subtitle") || "Your MCP server is ready to use"}
            >
              <div className="space-y-6">
                {/* Success Message */}
                <div className="p-4 bg-green-50 dark:bg-green-900 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-bold text-green-800 dark:text-green-100">
                        {t("destinations.add.mcp.step4.success") || "MCP Access Token Created Successfully"}
                      </h3>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-200">
                        <p><span className="font-bold">Token Name:</span> {generatedApiKey.name}</p>
                        <p><span className="font-bold">Created:</span> {new Date(generatedApiKey.createdAt).toLocaleString()}</p>
                        <p><span className="font-bold">Permissions:</span> Read-only access to workspace data</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-light">
                      {t("destinations.add.mcp.step4.configuration") || "MCP Client Configuration"}
                    </label>
                    <Button
                      background="Gray"
                      border="Light"
                      onClick={copyToClipboard}
                    >
                      {copied ? (
                        <span>Copied!</span>
                      ) : (
                        <span>Copy Configuration</span>
                      )}
                    </Button>
                  </div>
                  <pre className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded p-4 text-xs overflow-x-auto">
                    <code>{getMcpConfiguration()}</code>
                  </pre>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-2">
                    {t("destinations.add.mcp.step4.howToUse") || "How to use this configuration:"}
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Copy the configuration above</li>
                    <li>Add it to your MCP client's configuration file (e.g., Claude Desktop settings)</li>
                    <li>Restart your MCP client</li>
                    <li>Your AI assistant will now have read-only access to your workspace data</li>
                  </ol>
                </div>

                {/* Security Warning */}
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-100">
                        Important Security Note
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200">
                        <p>Keep your bearer token secure. This token provides read-only access to your workspace data. If compromised, revoke it immediately from your API keys management page.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card.Body>
            <Card.Footer>
              <div></div>
              <Button
                background="Pink"
                border="Light"
                onClick={() => window.location.href = `/${workspaceSlug}/destinations`}
              >
                <span>View All Destinations</span>
              </Button>
            </Card.Footer>
          </Card>
        )}
      </Content.Container>
    </AccountLayout>
  );
} 