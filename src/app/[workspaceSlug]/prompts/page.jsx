'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../i18n';

import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { gql } from '@apollo/client';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PaymentFailureBanner } from '@/components/billing/PaymentFailureBanner';
import { UpgradeModal } from '@/components/billing/UpgradeModal';

// Define GraphQL queries and mutations
const GET_PROMPTS = gql`
  query GetPrompts($workspaceSlug: String!) {
    prompts(workspaceSlug: $workspaceSlug) {
      _id
      phrase
      createdAt
      updatedAt
    }
  }
`;

const CREATE_PROMPT = gql`
  mutation CreatePrompt($workspaceSlug: String!, $phrase: String!) {
    createPrompt(workspaceSlug: $workspaceSlug, phrase: $phrase) {
      _id
      phrase
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_PROMPT = gql`
  mutation UpdatePrompt($workspaceSlug: String!, $id: ID!, $phrase: String!) {
    updatePrompt(workspaceSlug: $workspaceSlug, id: $id, phrase: $phrase) {
      _id
      phrase
      createdAt
      updatedAt
    }
  }
`;

const DELETE_PROMPT = gql`
  mutation DeletePrompt($workspaceSlug: String!, $id: ID!) {
    deletePrompt(workspaceSlug: $workspaceSlug, id: $id) {
      message
      remainingPrompts {
        _id
        phrase
        createdAt
        updatedAt
      }
    }
  }
`;

export default function PromptsPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [originalPrompts, setOriginalPrompts] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Entitlements hook
  const { entitlements } = useEntitlements();

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch prompts when component mounts
  useEffect(() => {
    const fetchPrompts = async () => {
      if (hasHydrated && workspaceSlug) {
        setIsLoading(true);
        
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_PROMPTS,
            { workspaceSlug }
          );
          
          if (result.data) {
            const fetchedPrompts = result.data.prompts || [];
            setOriginalPrompts(fetchedPrompts);
            setPrompts(fetchedPrompts);
          } else if (result.error) {
            console.error("Error fetching prompts:", result.error);
            toast.error(`Failed to load prompts: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL prompts query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchPrompts();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  // Check if user can add more prompts
  const canAddMorePrompts = () => {
    if (!entitlements) return true; // Allow if entitlements not loaded yet
    return prompts.length < entitlements.promptsLimit;
  };

  // Get character limit
  const getCharacterLimit = () => {
    return entitlements?.promptCharacterLimit || 150;
  };

  // Add new empty prompt field
  const addPromptField = () => {
    if (!canAddMorePrompts()) {
      setShowUpgradeModal(true);
      return;
    }
    setPrompts(prev => [...prev, { _id: null, phrase: '', isNew: true }]);
  };

  // Remove prompt field
  const removePromptField = (index) => {
    setPrompts(prev => prev.filter((_, i) => i !== index));
  };

  // Check for duplicate prompts
  const hasDuplicatePrompts = () => {
    const phrases = prompts
      .map(p => p.phrase.trim().toLowerCase())
      .filter(phrase => phrase !== '');
    const uniquePhrases = new Set(phrases);
    return phrases.length !== uniquePhrases.size;
  };

  // Get duplicate prompt indices
  const getDuplicateIndices = () => {
    const phraseMap = new Map();
    const duplicateIndices = new Set();

    prompts.forEach((p, index) => {
      const phrase = p.phrase.trim().toLowerCase();
      if (phrase === '') return;

      if (phraseMap.has(phrase)) {
        duplicateIndices.add(index);
        duplicateIndices.add(phraseMap.get(phrase));
      } else {
        phraseMap.set(phrase, index);
      }
    });

    return duplicateIndices;
  };

  // Handle prompt text change
  const handlePromptChange = (index, phrase) => {
    setPrompts(prev =>
      prev.map((p, i) =>
        i === index ? { ...p, phrase } : p
      )
    );
  };

  // Save all changes
  const saveAllChanges = async () => {
    // Check for duplicates before saving
    if (hasDuplicatePrompts()) {
      toast.error('Each prompt must be unique. Please remove or modify duplicate prompts.');
      return;
    }

    setIsSaving(true);

    try {
      const validPrompts = prompts.filter(p => p.phrase.trim());
      const operations = [];

      // Handle new prompts (create)
      const newPrompts = validPrompts.filter(p => !p._id);
      for (const prompt of newPrompts) {
        operations.push(
          executeMutation(graphqlClient, CREATE_PROMPT, {
            workspaceSlug,
            phrase: prompt.phrase.trim()
          })
        );
      }

      // Handle existing prompts (update)
      const existingPrompts = validPrompts.filter(p => p._id);
      for (const prompt of existingPrompts) {
        const original = originalPrompts.find(op => op._id === prompt._id);
        if (original && original.phrase !== prompt.phrase.trim()) {
          operations.push(
            executeMutation(graphqlClient, UPDATE_PROMPT, {
              workspaceSlug,
              id: prompt._id,
              phrase: prompt.phrase.trim()
            })
          );
        }
      }

      // Handle deleted prompts
      const currentIds = validPrompts.filter(p => p._id).map(p => p._id);
      const deletedPrompts = originalPrompts.filter(op => !currentIds.includes(op._id));
      for (const prompt of deletedPrompts) {
        operations.push(
          executeMutation(graphqlClient, DELETE_PROMPT, {
            workspaceSlug,
            id: prompt._id
          })
        );
      }

      // Execute all operations
      if (operations.length > 0) {
        await Promise.all(operations);
        
        // Refetch to get updated data
        const result = await executeQuery(graphqlClient, GET_PROMPTS, { workspaceSlug });
        if (result.data) {
          const updatedPrompts = result.data.prompts || [];
          setOriginalPrompts(updatedPrompts);
          setPrompts(updatedPrompts);
          toast.success('Prompts saved successfully');
        }
      } else {
        toast.success('No changes to save');
      }
    } catch (error) {
      console.error("Error saving prompts:", error);
      toast.error(`Error saving prompts: ${error.message}`);
    }
    
    setIsSaving(false);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    const validPrompts = prompts.filter(p => p.phrase.trim());
    
    // Check for new prompts
    if (validPrompts.some(p => !p._id)) return true;
    
    // Check for modified prompts
    if (validPrompts.some(p => {
      const original = originalPrompts.find(op => op._id === p._id);
      return original && original.phrase !== p.phrase.trim();
    })) return true;
    
    // Check for deleted prompts
    const currentIds = validPrompts.filter(p => p._id).map(p => p._id);
    if (originalPrompts.some(op => !currentIds.includes(op._id))) return true;
    
    return false;
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Prompts`} />
      <Content.Title
        title="Prompts"
        subtitle="Manage your prompt phrases for AI content generation"
      />
      <Content.Divider />
      <Content.Container>
        <PaymentFailureBanner />

        <Card>
          <Card.Body title="Prompt Phrases">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {prompts.map((prompt, index) => {
                  const charLimit = getCharacterLimit();
                  const charCount = prompt.phrase.length;
                  const isOverLimit = charCount > charLimit;
                  const duplicateIndices = getDuplicateIndices();
                  const isDuplicate = duplicateIndices.has(index);

                  return (
                    <div key={prompt._id || `new-${index}`}>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={prompt.phrase}
                            onChange={(e) => handlePromptChange(index, e.target.value)}
                            placeholder="Enter a prompt phrase..."
                            maxLength={charLimit}
                            className={`w-full px-3 py-2 bg-transparent border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                              isDuplicate
                                ? 'border-red-500 focus:ring-red-500'
                                : isOverLimit
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-400 focus:ring-green-500'
                            } text-light`}
                          />
                          <div className="flex items-center justify-between mt-1">
                            {isDuplicate ? (
                              <span className="text-xs text-red-500">
                                Duplicate prompt - each prompt must be unique
                              </span>
                            ) : (
                              <span className={`text-xs ${
                                isOverLimit ? 'text-red-500' : charCount > charLimit * 0.8 ? 'text-yellow-600' : 'text-gray-500'
                              }`}>
                                {charCount} / {charLimit} characters
                                {isOverLimit && ' (will be truncated)'}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Remove button - hidden for first field */}
                        {index > 0 && (
                          <button
                            onClick={() => removePromptField(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors self-start"
                            title="Remove field"
                          >
                            ×
                          </button>
                        )}
                        {/* Add button - only show on last field or if it's the only field */}
                        {(index === prompts.length - 1 || prompts.length === 1) && (
                          <button
                            onClick={addPromptField}
                            className={`px-3 py-2 rounded-md transition-colors self-start ${
                              !canAddMorePrompts()
                                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                            title={!canAddMorePrompts() ? 'Upgrade to add more prompts' : 'Add field'}
                            disabled={isLoading || isSaving}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {prompts.length === 0 && !isLoading && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          if (!canAddMorePrompts()) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          addPromptField();
                          setTimeout(() => {
                            handlePromptChange(0, e.target.value);
                          }, 0);
                        }
                      }}
                      placeholder="Enter a prompt phrase..."
                      maxLength={getCharacterLimit()}
                      className="flex-1 px-3 py-2 bg-transparent border border-gray-400 text-light rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={addPromptField}
                      className={`px-3 py-2 rounded-md transition-colors ${
                        !canAddMorePrompts()
                          ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      title={!canAddMorePrompts() ? 'Upgrade to add more prompts' : 'Add field'}
                      disabled={isLoading || isSaving}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Usage Indicator at Bottom */}
            {entitlements && !isLoading && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  {prompts.length} of {entitlements.promptsLimit} prompts used
                </p>
              </div>
            )}
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end items-center w-full">
              <button
                onClick={saveAllChanges}
                disabled={isLoading || isSaving || !hasUnsavedChanges()}
                className={`
                  px-6 py-2 rounded-md font-semibold text-dark transition-colors
                  ${isLoading || isSaving || !hasUnsavedChanges()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#51F72B] hover:bg-[#37B91A]'
                  }
                `}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </Card.Footer>
        </Card>

        {/* Upgrade Modal */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </Content.Container>
    </AccountLayout>
  );
} 