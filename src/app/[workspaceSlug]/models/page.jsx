'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../i18n';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { gql } from '@apollo/client';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { AVAILABLE_MODELS, PROVIDERS, getModelsByProvider, isModelHistoric } from '@/data/models';

// Define GraphQL queries and mutations
const GET_MODELS = gql`
  query GetModels($workspaceSlug: String!) {
    models(workspaceSlug: $workspaceSlug) {
      _id
      name
      provider
      modelId
      isEnabled
      createdAt
      updatedAt
    }
  }
`;

const CREATE_MODEL = gql`
  mutation CreateModel($workspaceSlug: String!, $name: String!, $provider: String!, $modelId: String!, $isEnabled: Boolean) {
    createModel(workspaceSlug: $workspaceSlug, name: $name, provider: $provider, modelId: $modelId, isEnabled: $isEnabled) {
      _id
      name
      provider
      modelId
      isEnabled
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_MODEL = gql`
  mutation UpdateModel($workspaceSlug: String!, $id: ID!, $name: String, $provider: String, $modelId: String, $isEnabled: Boolean) {
    updateModel(workspaceSlug: $workspaceSlug, id: $id, name: $name, provider: $provider, modelId: $modelId, isEnabled: $isEnabled) {
      _id
      name
      provider
      modelId
      isEnabled
      createdAt
      updatedAt
    }
  }
`;

const DELETE_MODEL = gql`
  mutation DeleteModel($workspaceSlug: String!, $id: ID!) {
    deleteModel(workspaceSlug: $workspaceSlug, id: $id) {
      message
      remainingModels {
        _id
        name
        provider
        modelId
        isEnabled
        createdAt
        updatedAt
      }
    }
  }
`;



export default function ModelsPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [enabledModels, setEnabledModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch enabled models when component mounts
  useEffect(() => {
    const fetchModels = async () => {
      if (hasHydrated && workspaceSlug) {
        setIsLoading(true);
        
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_MODELS,
            { workspaceSlug }
          );
          
          if (result.data) {
            setEnabledModels(result.data.models || []);
          } else if (result.error) {
            console.error("Error fetching models:", result.error);
            toast.error(`Failed to load models: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL models query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchModels();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  // Check if a model is currently enabled
  const isModelEnabled = (modelId) => {
    return enabledModels.some(model => model.modelId === modelId && model.isEnabled);
  };

  // Get the enabled model object for a given modelId
  const getEnabledModel = (modelId) => {
    return enabledModels.find(model => model.modelId === modelId);
  };

  // Handle model selection change
  const handleModelToggle = async (availableModel, isEnabled) => {
    setIsSaving(true);
    
    try {
      const existingModel = getEnabledModel(availableModel.id);
      
      if (existingModel) {
        if (isEnabled) {
          // Update existing model to enabled
          const result = await executeMutation(
            graphqlClient,
            UPDATE_MODEL,
            { 
              workspaceSlug, 
              id: existingModel._id, 
              isEnabled: true 
            }
          );

          if (result.data) {
            setEnabledModels(prev => 
              prev.map(m => m._id === existingModel._id ? result.data.updateModel : m)
            );
            toast.success(`${availableModel.name} enabled`);
          } else if (result.error) {
            toast.error(`Failed to enable model: ${result.error.message}`);
          }
        } else {
          // Delete the model (disable it)
          const result = await executeMutation(
            graphqlClient,
            DELETE_MODEL,
            { workspaceSlug, id: existingModel._id }
          );

          if (result.data) {
            setEnabledModels(result.data.deleteModel.remainingModels);
            toast.success(`${availableModel.name} disabled`);
          } else if (result.error) {
            toast.error(`Failed to disable model: ${result.error.message}`);
          }
        }
      } else if (isEnabled) {
        // Create new model
        const result = await executeMutation(
          graphqlClient,
          CREATE_MODEL,
          { 
            workspaceSlug, 
            name: availableModel.name,
            provider: availableModel.provider,
            modelId: availableModel.id,
            isEnabled: true
          }
        );

        if (result.data) {
          setEnabledModels(prev => [...prev, result.data.createModel]);
          toast.success(`${availableModel.name} enabled`);
        } else if (result.error) {
          toast.error(`Failed to enable model: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error("Error toggling model:", error);
      toast.error(`Error updating model: ${error.message}`);
    }
    
    setIsSaving(false);
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Models`} />
      <Content.Title
        title="AI Models"
        subtitle="Select the AI models you want to enable for your workspace"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title="Available Models" subtitle="Choose from our supported AI models">
            {isLoading ? (
              <div className="animate-pulse space-y-6">
                {PROVIDERS.map((provider) => (
                  <div key={provider.id}>
                    <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="w-4 h-4 bg-gray-200 rounded"></div>
                          <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {PROVIDERS.map((provider) => {
                  const providerModels = getModelsByProvider(provider.id);
                  
                  // Get user's enabled models for this provider (including historic ones)
                  const userEnabledModels = enabledModels.filter(userModel => 
                    userModel.provider === provider.id && userModel.isEnabled
                  );
                  
                  // Combine current available models with user's historic models
                  const allModelsForProvider = [...providerModels];
                  
                  // Add user's historic models that aren't in current available models
                  userEnabledModels.forEach(userModel => {
                    if (!providerModels.find(availableModel => availableModel.id === userModel.modelId)) {
                      allModelsForProvider.push({
                        id: userModel.modelId,
                        name: userModel.name,
                        provider: userModel.provider,
                        description: 'Historic model - no longer available for new selections',
                        isHistoric: true
                      });
                    }
                  });
                  
                  if (allModelsForProvider.length === 0) return null;
                  
                  return (
                    <div key={provider.id}>
                      <div className="flex items-center space-x-3 mb-4">
                        <h3 className="text-lg font-semibold text-light">
                          {provider.name}
                        </h3>
                        <span className="text-sm text-light opacity-75">
                          ({allModelsForProvider.filter(model => isModelEnabled(model.id)).length} of {allModelsForProvider.length} enabled)
                        </span>
                      </div>
                      
                      <div className="grid gap-3">
                        {allModelsForProvider.map((model) => {
                          const enabled = isModelEnabled(model.id);
                          const historic = model.isHistoric || isModelHistoric(model.id);
                          
                          return (
                            <div
                              key={model.id}
                              className={`flex items-start space-x-3 p-3 border rounded-lg transition-colors ${
                                historic
                                  ? 'border-orange-400 bg-orange-50 bg-opacity-10'
                                  : enabled 
                                    ? 'border-gray-400 bg-transparent cursor-pointer' 
                                    : 'border-gray-400 hover:border-green-500 bg-transparent cursor-pointer'
                              }`}
                              onClick={() => !isSaving && !historic && handleModelToggle(model, !enabled)}
                            >
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={() => {}} // Handled by onClick above
                                disabled={isSaving || historic}
                                className="mt-1 w-4 h-4 accent-[#43B929] border-gray-400 bg-transparent rounded focus:ring-green-500 disabled:opacity-50"
                              />
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className={`font-medium ${historic ? 'text-orange-400' : 'text-light'}`}>
                                    {model.name}
                                  </h4>
                                  <span className={`text-xs px-2 py-1 bg-transparent border rounded ${
                                    historic ? 'border-orange-400 text-orange-400' : 'border-gray-400 text-light'
                                  }`}>
                                    {model.id}
                                  </span>
                                  {historic && (
                                    <span className="text-xs px-2 py-1 bg-orange-500 text-white rounded">
                                      Historic
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm mt-1 ${historic ? 'text-orange-300' : 'text-light opacity-75'}`}>
                                  {model.description}
                                </p>
                                {historic && enabled && (
                                  <p className="text-xs text-orange-300 mt-2 italic">
                                    This model is historic and is no longer available in the {provider.name} user interface. 
                                    If you remove it, you will no longer be able to add this model back to your workspace.
                                  </p>
                                )}
                              </div>
                              {historic && enabled && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isSaving) handleModelToggle(model, false);
                                  }}
                                  disabled={isSaving}
                                  className="text-orange-400 hover:text-orange-300 text-sm underline disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {enabledModels.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-light opacity-75">
                    <p>No models enabled yet. Select models above to get started.</p>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
          
          {!isLoading && (
            <Card.Footer>
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-light opacity-75">
                  {enabledModels.filter(m => m.isEnabled).length} models enabled
                </span>
                {isSaving && (
                  <span className="text-sm text-green-600">
                    Saving...
                  </span>
                )}
              </div>
            </Card.Footer>
          )}
        </Card>
      </Content.Container>
    </AccountLayout>
  );
} 