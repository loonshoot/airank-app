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
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Separate own brand and competitor brands
  const ownBrand = brands.find(brand => brand.isOwnBrand) || { _id: null, name: '', isOwnBrand: true };
  const competitorBrands = brands.filter(brand => !brand.isOwnBrand);

  // Fill competitor brands array to always show 5 slots
  const competitorBrandSlots = Array.from({ length: 5 }, (_, index) => 
    competitorBrands[index] || { _id: null, name: '', isOwnBrand: false, isNew: true }
  );

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
            setBrands(result.data.brands || []);
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

  // Handle brand text change with auto-save
  const handleBrandChange = async (brandId, name, isOwnBrand) => {
    if (!name.trim()) {
      // If empty and it's an existing brand, delete it
      if (brandId && !isOwnBrand) {
        await handleDeleteBrand(brandId);
      }
      return;
    }

    try {
      if (brandId) {
        // Update existing brand
        const result = await executeMutation(
          graphqlClient,
          UPDATE_BRAND,
          { workspaceSlug, id: brandId, name, isOwnBrand }
        );

        if (result.data) {
          setBrands(prev => 
            prev.map(b => b._id === brandId ? result.data.updateBrand : b)
          );
          toast.success(`${isOwnBrand ? 'Your brand' : 'Competitor brand'} updated successfully`);
        } else if (result.error) {
          toast.error(`Failed to update brand: ${result.error.message}`);
        }
      } else {
        // Create new brand
        const result = await executeMutation(
          graphqlClient,
          CREATE_BRAND,
          { workspaceSlug, name, isOwnBrand }
        );

        if (result.data) {
          setBrands(prev => [...prev, result.data.createBrand]);
          toast.success(`${isOwnBrand ? 'Your brand' : 'Competitor brand'} created successfully`);
        } else if (result.error) {
          toast.error(`Failed to create brand: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error("Error saving brand:", error);
      toast.error(`Error saving brand: ${error.message}`);
    }
  };

  // Handle brand deletion
  const handleDeleteBrand = async (brandId) => {
    try {
      const result = await executeMutation(
        graphqlClient,
        DELETE_BRAND,
        { workspaceSlug, id: brandId }
      );

      if (result.data) {
        setBrands(result.data.deleteBrand.remainingBrands);
        toast.success('Brand deleted successfully');
      } else if (result.error) {
        toast.error(`Failed to delete brand: ${result.error.message}`);
      }
    } catch (error) {
      console.error("Error deleting brand:", error);
      toast.error(`Error deleting brand: ${error.message}`);
    }
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
                  onChange={(e) => {
                    const newName = e.target.value;
                    setBrands(prev => {
                      const filtered = prev.filter(b => !b.isOwnBrand);
                      return [...filtered, { ...ownBrand, name: newName }];
                    });
                  }}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name) {
                      handleBrandChange(ownBrand._id, name, true);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const name = e.target.value.trim();
                      if (name) {
                        handleBrandChange(ownBrand._id, name, true);
                      }
                    }
                  }}
                  placeholder="Enter your brand name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            )}
          </Card.Body>
        </Card>

        {/* Competitor Brands Section */}
        <Card>
          <Card.Body title="Competitor Brands" subtitle="Monitor up to 5 competitor brands">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {competitorBrandSlots.map((brand, index) => (
                  <div key={brand._id || `competitor-${index}`} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 w-8">{index + 1}.</span>
                    <input
                      type="text"
                      value={brand.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setBrands(prev => {
                          const newBrands = [...prev];
                          const existingIndex = newBrands.findIndex(b => 
                            !b.isOwnBrand && newBrands.filter(br => !br.isOwnBrand).indexOf(b) === index
                          );
                          
                          if (existingIndex !== -1) {
                            newBrands[existingIndex] = { ...newBrands[existingIndex], name: newName };
                          } else {
                            // Add as new brand placeholder
                            const competitorCount = newBrands.filter(b => !b.isOwnBrand).length;
                            if (competitorCount <= index) {
                              newBrands.push({ _id: null, name: newName, isOwnBrand: false, isNew: true });
                            }
                          }
                          
                          return newBrands;
                        });
                      }}
                      onBlur={(e) => {
                        const name = e.target.value.trim();
                        handleBrandChange(brand._id, name, false);
                      }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const name = e.target.value.trim();
                          handleBrandChange(brand._id, name, false);
                        }
                      }}
                      placeholder={`Competitor brand ${index + 1}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                    {brand._id && (
                      <button
                        onClick={() => handleDeleteBrand(brand._id)}
                        className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
} 