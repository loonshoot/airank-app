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
const GET_BRANDS = gql`
  query GetBrands($workspaceSlug: String!) {
    brands(workspaceSlug: $workspaceSlug) {
      _id
      name
      isOwnBrand
      createdAt
      updatedAt
    }
  }
`;

const CREATE_BRAND = gql`
  mutation CreateBrand($workspaceSlug: String!, $name: String!, $isOwnBrand: Boolean) {
    createBrand(workspaceSlug: $workspaceSlug, name: $name, isOwnBrand: $isOwnBrand) {
      _id
      name
      isOwnBrand
      createdAt
      updatedAt
    }
  }
`;

const UPDATE_BRAND = gql`
  mutation UpdateBrand($workspaceSlug: String!, $id: ID!, $name: String, $isOwnBrand: Boolean) {
    updateBrand(workspaceSlug: $workspaceSlug, id: $id, name: $name, isOwnBrand: $isOwnBrand) {
      _id
      name
      isOwnBrand
      createdAt
      updatedAt
    }
  }
`;

const DELETE_BRAND = gql`
  mutation DeleteBrand($workspaceSlug: String!, $id: ID!) {
    deleteBrand(workspaceSlug: $workspaceSlug, id: $id) {
      message
      remainingBrands {
        _id
        name
        isOwnBrand
        createdAt
        updatedAt
      }
    }
  }
`;

export default function BrandsPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [originalBrands, setOriginalBrands] = useState([]);
  const [brands, setBrands] = useState([]);
  const [competitorBrands, setCompetitorBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get own brand from brands array
  const ownBrand = brands.find(brand => brand.isOwnBrand) || { _id: null, name: '', isOwnBrand: true };

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch brands when component mounts
  useEffect(() => {
    const fetchBrands = async () => {
      if (hasHydrated && workspaceSlug) {
        setIsLoading(true);
        
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_BRANDS,
            { workspaceSlug }
          );
          
          if (result.data) {
            const fetchedBrands = result.data.brands || [];
            setOriginalBrands(fetchedBrands);
            setBrands(fetchedBrands);
            setCompetitorBrands(fetchedBrands.filter(brand => !brand.isOwnBrand));
          } else if (result.error) {
            console.error("Error fetching brands:", result.error);
            toast.error(`Failed to load brands: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL brands query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchBrands();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  // Handle own brand change
  const handleOwnBrandChange = (name) => {
    setBrands(prev => {
      const filtered = prev.filter(b => !b.isOwnBrand);
      return [...filtered, { ...ownBrand, name }];
    });
  };

  // Add new competitor brand field
  const addCompetitorField = () => {
    setCompetitorBrands(prev => [...prev, { _id: null, name: '', isOwnBrand: false, isNew: true }]);
  };

  // Remove competitor brand field
  const removeCompetitorField = (index) => {
    setCompetitorBrands(prev => prev.filter((_, i) => i !== index));
  };

  // Handle competitor brand change
  const handleCompetitorChange = (index, name) => {
    setCompetitorBrands(prev => 
      prev.map((brand, i) => 
        i === index ? { ...brand, name } : brand
      )
    );
  };

  // Save all changes
  const saveAllChanges = async () => {
    setIsSaving(true);
    
    try {
      const operations = [];

      // Handle own brand
      const ownBrandName = ownBrand.name.trim();
      if (ownBrandName) {
        const originalOwnBrand = originalBrands.find(b => b.isOwnBrand);
        if (ownBrand._id && originalOwnBrand) {
          // Update existing own brand
          if (originalOwnBrand.name !== ownBrandName) {
            operations.push(
              executeMutation(graphqlClient, UPDATE_BRAND, {
                workspaceSlug,
                id: ownBrand._id,
                name: ownBrandName,
                isOwnBrand: true
              })
            );
          }
        } else if (!ownBrand._id) {
          // Create new own brand
          operations.push(
            executeMutation(graphqlClient, CREATE_BRAND, {
              workspaceSlug,
              name: ownBrandName,
              isOwnBrand: true
            })
          );
        }
      } else if (ownBrand._id) {
        // Delete own brand if it exists but name is empty
        operations.push(
          executeMutation(graphqlClient, DELETE_BRAND, {
            workspaceSlug,
            id: ownBrand._id
          })
        );
      }

      // Handle competitor brands
      const validCompetitorBrands = competitorBrands.filter(b => b.name.trim());
      
      // Create new competitor brands
      const newCompetitorBrands = validCompetitorBrands.filter(b => !b._id);
      for (const brand of newCompetitorBrands) {
        operations.push(
          executeMutation(graphqlClient, CREATE_BRAND, {
            workspaceSlug,
            name: brand.name.trim(),
            isOwnBrand: false
          })
        );
      }

      // Update existing competitor brands
      const existingCompetitorBrands = validCompetitorBrands.filter(b => b._id);
      for (const brand of existingCompetitorBrands) {
        const original = originalBrands.find(ob => ob._id === brand._id);
        if (original && original.name !== brand.name.trim()) {
          operations.push(
            executeMutation(graphqlClient, UPDATE_BRAND, {
              workspaceSlug,
              id: brand._id,
              name: brand.name.trim(),
              isOwnBrand: false
            })
          );
        }
      }

      // Delete removed competitor brands
      const currentCompetitorIds = validCompetitorBrands.filter(b => b._id).map(b => b._id);
      const deletedCompetitorBrands = originalBrands.filter(ob => 
        !ob.isOwnBrand && !currentCompetitorIds.includes(ob._id)
      );
      for (const brand of deletedCompetitorBrands) {
        operations.push(
          executeMutation(graphqlClient, DELETE_BRAND, {
            workspaceSlug,
            id: brand._id
          })
        );
      }

      // Execute all operations
      if (operations.length > 0) {
        await Promise.all(operations);
        
        // Refetch to get updated data
        const result = await executeQuery(graphqlClient, GET_BRANDS, { workspaceSlug });
        if (result.data) {
          const updatedBrands = result.data.brands || [];
          setOriginalBrands(updatedBrands);
          setBrands(updatedBrands);
          setCompetitorBrands(updatedBrands.filter(brand => !brand.isOwnBrand));
          toast.success('Brands saved successfully');
        }
      } else {
        toast.success('No changes to save');
      }
    } catch (error) {
      console.error("Error saving brands:", error);
      toast.error(`Error saving brands: ${error.message}`);
    }
    
    setIsSaving(false);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = () => {
    // Check own brand changes
    const originalOwnBrand = originalBrands.find(b => b.isOwnBrand);
    const ownBrandName = ownBrand.name.trim();
    
    if (originalOwnBrand && originalOwnBrand.name !== ownBrandName) return true;
    if (!originalOwnBrand && ownBrandName) return true;
    if (originalOwnBrand && !ownBrandName) return true;
    
    // Check competitor brand changes
    const validCompetitorBrands = competitorBrands.filter(b => b.name.trim());
    
    // Check for new competitor brands
    if (validCompetitorBrands.some(b => !b._id)) return true;
    
    // Check for modified competitor brands
    if (validCompetitorBrands.some(b => {
      const original = originalBrands.find(ob => ob._id === b._id);
      return original && original.name !== b.name.trim();
    })) return true;
    
    // Check for deleted competitor brands
    const currentCompetitorIds = validCompetitorBrands.filter(b => b._id).map(b => b._id);
    if (originalBrands.some(ob => !ob.isOwnBrand && !currentCompetitorIds.includes(ob._id))) return true;
    
    return false;
  };

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | Brands`} />
      <Content.Title
        title="Brands"
        subtitle="Manage your brand and competitor brands for monitoring"
      />
      <Content.Divider />
      <Content.Container>
        {/* Your Brand Section */}
        <Card>
          <Card.Body title="Your Brand" subtitle="Set your primary brand name">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="max-w-md">
                <input
                  type="text"
                  value={ownBrand.name}
                  onChange={(e) => handleOwnBrandChange(e.target.value)}
                  placeholder="Enter your brand name..."
                  className="w-full px-3 py-2 bg-transparent border border-gray-400 text-light rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Competitor Brands Section */}
        <Card>
          <Card.Body title="Competitor Brands" subtitle="Add competitor brands to monitor">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {competitorBrands.map((brand, index) => (
                  <div key={brand._id || `competitor-${index}`} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={brand.name}
                      onChange={(e) => handleCompetitorChange(index, e.target.value)}
                      placeholder={`Competitor brand ${index + 1}...`}
                      className="flex-1 px-3 py-2 bg-transparent border border-gray-400 text-light rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {/* Remove button - hidden for first field */}
                    {index > 0 && (
                      <button
                        onClick={() => removeCompetitorField(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title="Remove field"
                      >
                        ×
                      </button>
                    )}
                    {/* Add button - only show on last field or if it's the only field */}
                    {(index === competitorBrands.length - 1 || competitorBrands.length === 1) && (
                      <button
                        onClick={addCompetitorField}
                        className="px-3 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                        title="Add field"
                        disabled={isLoading || isSaving}
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
                
                {competitorBrands.length === 0 && !isLoading && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addCompetitorField();
                          setTimeout(() => {
                            handleCompetitorChange(0, e.target.value);
                          }, 0);
                        }
                      }}
                      placeholder="Competitor brand 1..."
                      className="flex-1 px-3 py-2 bg-transparent border border-gray-400 text-light rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <button
                      onClick={addCompetitorField}
                      className="px-3 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                      title="Add field"
                      disabled={isLoading || isSaving}
                    >
                      +
                    </button>
                  </div>
                )}
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
      </Content.Container>
    </AccountLayout>
  );
} 