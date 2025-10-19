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
import { gql } from '@apollo/client';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { useEntitlements } from '@/hooks/useEntitlements';
import { PaymentFailureBanner } from '@/components/billing/PaymentFailureBanner';
import { UpgradeModal } from '@/components/billing/UpgradeModal';

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
  const { workspace } = useWorkspace();
  const [hasHydrated, setHasHydrated] = useState(false);

  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [originalBrands, setOriginalBrands] = useState([]);
  const [brands, setBrands] = useState([]);
  const [competitorBrands, setCompetitorBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Entitlements hook
  const { entitlements } = useEntitlements();

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  // Check if user can add more brands (only counting competitor brands)
  const canAddMoreBrands = () => {
    if (!entitlements) return true; // Allow if entitlements not loaded yet
    // Only count competitor brands - own brand doesn't count toward limit
    return competitorBrands.length < entitlements.brandsLimit;
  };

  // Check for duplicate brands
  const hasDuplicateBrands = () => {
    const allBrandNames = [
      ownBrand.name.trim().toLowerCase(),
      ...competitorBrands.map(b => b.name.trim().toLowerCase())
    ].filter(name => name !== '');

    const uniqueNames = new Set(allBrandNames);
    return allBrandNames.length !== uniqueNames.size;
  };

  // Get duplicate brand indices (including own brand if duplicate)
  const getDuplicateIndices = () => {
    const nameMap = new Map();
    const duplicateIndices = new Set();
    let ownBrandIsDuplicate = false;

    // Check own brand
    const ownBrandName = ownBrand.name.trim().toLowerCase();
    if (ownBrandName !== '') {
      nameMap.set(ownBrandName, 'own');
    }

    // Check competitor brands
    competitorBrands.forEach((brand, index) => {
      const name = brand.name.trim().toLowerCase();
      if (name === '') return;

      if (nameMap.has(name)) {
        duplicateIndices.add(index);
        if (nameMap.get(name) === 'own') {
          ownBrandIsDuplicate = true;
        } else {
          duplicateIndices.add(nameMap.get(name));
        }
      } else {
        nameMap.set(name, index);
      }
    });

    return { competitorIndices: duplicateIndices, ownBrandIsDuplicate };
  };

  // Add new competitor brand field
  const addCompetitorField = () => {
    if (!canAddMoreBrands()) {
      setShowUpgradeModal(true);
      return;
    }
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

  // Check if a brand is over the limit
  const isBrandOverLimit = (index) => {
    if (!entitlements) return false;
    // Only competitor brands count toward limit - own brand is free
    // Competitor brand at index 0 is position 1, index 1 is position 2, etc.
    const brandPosition = index + 1;
    return brandPosition > entitlements.brandsLimit;
  };

  // Check if own brand has unsaved changes
  const hasOwnBrandUnsavedChanges = () => {
    const originalOwnBrand = originalBrands.find(b => b.isOwnBrand);
    const ownBrandName = ownBrand.name.trim();

    if (originalOwnBrand && originalOwnBrand.name !== ownBrandName) return true;
    if (!originalOwnBrand && ownBrandName) return true;
    if (originalOwnBrand && !ownBrandName) return true;

    return false;
  };

  // Check if competitor brands have unsaved changes
  const hasCompetitorBrandsUnsavedChanges = () => {
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

  // Save own brand changes
  const saveOwnBrand = async () => {
    // Check for duplicates before saving
    if (hasDuplicateBrands()) {
      toast.error('Each brand must be unique. Please remove or modify duplicate brands.');
      return;
    }

    setIsSaving(true);

    try {
      const operations = [];
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

      if (operations.length > 0) {
        await Promise.all(operations);

        // Refetch to get updated data
        const result = await executeQuery(graphqlClient, GET_BRANDS, { workspaceSlug });
        if (result.data) {
          const updatedBrands = result.data.brands || [];
          setOriginalBrands(updatedBrands);
          setBrands(updatedBrands);
          setCompetitorBrands(updatedBrands.filter(brand => !brand.isOwnBrand));
          toast.success('Own brand saved successfully');
        }
      } else {
        toast.success('No changes to save');
      }
    } catch (error) {
      console.error("Error saving own brand:", error);
      toast.error(`Error saving own brand: ${error.message}`);
    }

    setIsSaving(false);
  };

  // Save competitor brands changes
  const saveCompetitorBrands = async () => {
    // Check for duplicates before saving (only check non-over-limit brands)
    const withinLimitBrands = competitorBrands.filter((_, index) => !isBrandOverLimit(index));
    const ownBrandCount = ownBrand.name.trim() ? 1 : 0;

    // Check duplicates only among brands we're actually saving
    const allNamesToCheck = [
      ...(ownBrand.name.trim() ? [ownBrand.name.trim().toLowerCase()] : []),
      ...withinLimitBrands.map(b => b.name.trim().toLowerCase()).filter(n => n !== '')
    ];
    const uniqueNames = new Set(allNamesToCheck);
    if (allNamesToCheck.length !== uniqueNames.size) {
      toast.error('Each brand must be unique. Please remove or modify duplicate brands.');
      return;
    }

    setIsSaving(true);

    try {
      const operations = [];

      // Only process competitor brands within the limit (own brand doesn't count)
      const allowedBrandCount = entitlements ? entitlements.brandsLimit : competitorBrands.length;
      const brandsToSave = competitorBrands.slice(0, allowedBrandCount);
      const validCompetitorBrands = brandsToSave.filter(b => b.name.trim());

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

      // Delete removed competitor brands AND over-limit brands
      const currentCompetitorIds = validCompetitorBrands.filter(b => b._id).map(b => b._id);

      // Also get IDs of over-limit brands that need to be deleted
      const overLimitBrands = competitorBrands.slice(allowedBrandCount);
      const overLimitIds = overLimitBrands.filter(b => b._id).map(b => b._id);

      const deletedCompetitorBrands = originalBrands.filter(ob =>
        !ob.isOwnBrand && (!currentCompetitorIds.includes(ob._id) || overLimitIds.includes(ob._id))
      );

      for (const brand of deletedCompetitorBrands) {
        operations.push(
          executeMutation(graphqlClient, DELETE_BRAND, {
            workspaceSlug,
            id: brand._id
          })
        );
      }

      if (operations.length > 0) {
        await Promise.all(operations);

        // Refetch to get updated data
        const result = await executeQuery(graphqlClient, GET_BRANDS, { workspaceSlug });
        if (result.data) {
          const updatedBrands = result.data.brands || [];
          setOriginalBrands(updatedBrands);
          setBrands(updatedBrands);
          setCompetitorBrands(updatedBrands.filter(brand => !brand.isOwnBrand));

          // Show appropriate success message
          if (overLimitIds.length > 0) {
            toast.success(`Brands saved. ${overLimitIds.length} over-limit brand(s) removed.`);
          } else {
            toast.success('Competitor brands saved successfully');
          }
        }
      } else {
        toast.success('No changes to save');
      }
    } catch (error) {
      console.error("Error saving competitor brands:", error);
      toast.error(`Error saving competitor brands: ${error.message}`);
    }

    setIsSaving(false);
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
        <PaymentFailureBanner />

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
                  className={`w-full px-3 py-2 bg-transparent border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                    getDuplicateIndices().ownBrandIsDuplicate
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-400 focus:ring-green-500'
                  } text-light`}
                />
                {getDuplicateIndices().ownBrandIsDuplicate && (
                  <p className="text-xs text-red-500 mt-1">
                    Duplicate brand - each brand must be unique
                  </p>
                )}
              </div>
            )}
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end items-center w-full">
              <button
                onClick={saveOwnBrand}
                disabled={isLoading || isSaving || !hasOwnBrandUnsavedChanges()}
                className={`
                  px-6 py-2 rounded-md font-semibold text-dark transition-colors
                  ${isLoading || isSaving || !hasOwnBrandUnsavedChanges()
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
                {competitorBrands.map((brand, index) => {
                  const duplicates = getDuplicateIndices();
                  const isDuplicate = duplicates.competitorIndices.has(index);
                  const isOverLimit = isBrandOverLimit(index);

                  return (
                    <div key={brand._id || `competitor-${index}`}>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={brand.name}
                            onChange={(e) => {
                              if (isOverLimit) {
                                setShowUpgradeModal(true);
                                return;
                              }
                              handleCompetitorChange(index, e.target.value);
                            }}
                            onClick={() => {
                              if (isOverLimit) {
                                setShowUpgradeModal(true);
                              }
                            }}
                            placeholder={`Competitor brand ${index + 1}...`}
                            className={`w-full px-3 py-2 bg-transparent border rounded-md focus:outline-none focus:ring-2 focus:border-transparent ${
                              isDuplicate || isOverLimit
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-gray-400 focus:ring-green-500'
                            } ${isOverLimit ? 'cursor-pointer' : ''} text-light`}
                            readOnly={isOverLimit}
                          />
                          {isDuplicate && !isOverLimit && (
                            <p className="text-xs text-red-500 mt-1">
                              Duplicate brand - each brand must be unique
                            </p>
                          )}
                          {isOverLimit && (
                            <p className="text-xs text-red-500 mt-1">
                              Over limit - will be removed when saving
                            </p>
                          )}
                        </div>
                        {/* Remove button - hidden for first field */}
                        {index > 0 && (
                          <button
                            onClick={() => removeCompetitorField(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors self-start"
                            title="Remove field"
                          >
                            ×
                          </button>
                        )}
                        {/* Add button - only show on last field or if it's the only field */}
                        {(index === competitorBrands.length - 1 || competitorBrands.length === 1) && (
                          <button
                            onClick={addCompetitorField}
                            className={`px-3 py-2 rounded-md transition-colors self-start ${
                              !canAddMoreBrands()
                                ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                                : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                            }`}
                            title={!canAddMoreBrands() ? 'Upgrade to add more brands' : 'Add field'}
                            disabled={isLoading || isSaving}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {competitorBrands.length === 0 && !isLoading && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          if (!canAddMoreBrands()) {
                            setShowUpgradeModal(true);
                            return;
                          }
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
                      className={`px-3 py-2 rounded-md transition-colors ${
                        !canAddMoreBrands()
                          ? 'text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50'
                          : 'text-green-600 hover:text-green-800 hover:bg-green-50'
                      }`}
                      title={!canAddMoreBrands() ? 'Upgrade to add more brands' : 'Add field'}
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
                  {competitorBrands.filter(b => b.name.trim()).length} of {entitlements.brandsLimit} competitor brands used
                </p>
              </div>
            )}
          </Card.Body>
          <Card.Footer>
            <div className="flex justify-end items-center w-full">
              <button
                onClick={saveCompetitorBrands}
                disabled={isLoading || isSaving || !hasCompetitorBrandsUnsavedChanges()}
                className={`
                  px-6 py-2 rounded-md font-semibold text-dark transition-colors
                  ${isLoading || isSaving || !hasCompetitorBrandsUnsavedChanges()
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