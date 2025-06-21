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
  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
            setPrompts(result.data.prompts || []);
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

  // Handle prompt text change with auto-save
  const handlePromptChange = async (promptId, phrase) => {
    if (!phrase.trim()) return;

    try {
      if (promptId) {
        // Update existing prompt
        const result = await executeMutation(
          graphqlClient,
          UPDATE_PROMPT,
          { workspaceSlug, id: promptId, phrase }
        );

        if (result.data) {
          setPrompts(prev => 
            prev.map(p => p._id === promptId ? result.data.updatePrompt : p)
          );
          toast.success('Prompt updated successfully');
        } else if (result.error) {
          toast.error(`Failed to update prompt: ${result.error.message}`);
        }
      } else {
        // Create new prompt
        const result = await executeMutation(
          graphqlClient,
          CREATE_PROMPT,
          { workspaceSlug, phrase }
        );

        if (result.data) {
          setPrompts(prev => [...prev, result.data.createPrompt]);
          toast.success('Prompt created successfully');
        } else if (result.error) {
          toast.error(`Failed to create prompt: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error(`Error saving prompt: ${error.message}`);
    }
  };

  // Handle prompt deletion
  const handleDeletePrompt = async (promptId) => {
    try {
      const result = await executeMutation(
        graphqlClient,
        DELETE_PROMPT,
        { workspaceSlug, id: promptId }
      );

      if (result.data) {
        setPrompts(result.data.deletePrompt.remainingPrompts);
        toast.success('Prompt deleted successfully');
      } else if (result.error) {
        toast.error(`Failed to delete prompt: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast.error(`Error deleting prompt: ${error.message}`);
    }
  };

  // Add new empty prompt field
  const addNewPromptField = () => {
    setPrompts(prev => [...prev, { _id: null, phrase: '', isNew: true }]);
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
                {prompts.map((prompt, index) => (
                  <div key={prompt._id || `new-${index}`} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={prompt.phrase}
                      onChange={(e) => {
                        const newPhrase = e.target.value;
                        setPrompts(prev => 
                          prev.map((p, i) => 
                            i === index ? { ...p, phrase: newPhrase } : p
                          )
                        );
                      }}
                      onBlur={(e) => {
                        const phrase = e.target.value.trim();
                        if (phrase) {
                          handlePromptChange(prompt._id, phrase);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const phrase = e.target.value.trim();
                          if (phrase) {
                            handlePromptChange(prompt._id, phrase);
                          }
                        }
                      }}
                      placeholder="Enter a prompt phrase..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    {prompt._id && (
                      <button
                        onClick={() => handleDeletePrompt(prompt._id)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                
                {prompts.length === 0 && !isLoading && (
                  <p className="text-gray-500 text-center py-8">
                    No prompts configured yet. Click the + button to add your first prompt.
                  </p>
                )}
              </div>
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              disabled={isLoading}
              onClick={addNewPromptField}
            >
              + Add Prompt
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
} 