'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import '../../../i18n'; // Import i18n initialization
import { useRouter } from 'next/navigation';
import { use } from 'react';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout, AppRouterGridLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";

export default function AddSourcePage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [sourceSystems, setSourceSystems] = useState([]);
  
  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch available source systems
  useEffect(() => {
    const fetchSourceSystems = async () => {
      if (hasHydrated) {
        setIsLoading(true);
        
        try {
          // Fetch available source systems from the API
          const response = await fetch('/api/catalogs/sources');
          if (response.ok) {
            const data = await response.json();
            
            // Process the paths to replace the {{workspaceSlug}} placeholder
            const processedData = data.map(item => ({
              ...item,
              path: item.path.replace('{{workspaceSlug}}', workspaceSlug)
            }));
            
            setSourceSystems(processedData);
          } else {
            console.error("Failed to fetch source systems");
            toast.error("Failed to load available sources");
          }
        } catch (error) {
          console.error("Error fetching source systems:", error);
          toast.error(`Error: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchSourceSystems();
  }, [hasHydrated, workspaceSlug]);

  return (
    <AccountLayout routerType="app">
      <Meta title={`Outrun - ${workspace?.name || 'Dashboard'} | ${t("sources.add.title")}`} />
      <Content.Title
        title={t("sources.add.title")}
        subtitle={t("sources.add.subtitle")}
      />
      <Content.Divider />
      <Content.Container>
        <AppRouterGridLayout>
          {isLoading ? (
            // Loading state
            <>
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <Card.Body>
                    <div className="animate-pulse">
                      <div className="h-10 bg-gray-200 rounded mb-2.5"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </Card.Body>
                  <Card.Footer />
                </Card>
              ))}
            </>
          ) : sourceSystems.length > 0 ? (
            // Display available source systems
            sourceSystems.map((system, index) => (
              <Card key={index}>
                <Card.Body
                  title={t(system.name) || system.name}
                  icon={system.logo}
                  subtitle={system.description}
                />
                <Card.Footer>
                  <Button
                    background="Pink"
                    border="Light"
                    onClick={() => window.location.href = system.path}
                  >
                    {t("sources.add.button")}
                  </Button>
                </Card.Footer>
              </Card>
            ))
          ) : (
            <Card>
              <Card.Body
                title="No sources available"
                subtitle="No source integrations were found."
              />
            </Card>
          )}
        </AppRouterGridLayout>
      </Content.Container>
    </AccountLayout>
  );
}