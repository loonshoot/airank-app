'use client';

import { useState, useEffect, use } from 'react';
import toast from 'react-hot-toast';
import '../../i18n'; // Import i18n initialization

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
  executeQuery
} from '@/graphql/operations';

// Define GraphQL queries
const GET_SOURCES = gql`
  query Sources($workspaceSlug: String!) {
    sources(workspaceSlug: $workspaceSlug) {
      _id
      name
      sourceType
      status
    }
  }
`;

export default function SourcesPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [sources, setSources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch data with GraphQL when component mounts
  useEffect(() => {
    const fetchGraphQLData = async () => {
      if (hasHydrated && workspaceSlug) {
        setIsLoading(true);
        
        try {
          // Check if we can get a valid token first
          const tokenResponse = await fetch('/api/auth/token');
          if (tokenResponse.ok) {
            const { token } = await tokenResponse.json();
            console.log("Using token:", token ? `${token.substring(0, 15)}...` : 'No token available');
          }
        } catch (error) {
          console.error("Error fetching auth token:", error);
        }
        
        // Fetch sources
        try {
          const result = await executeQuery(
            graphqlClient, 
            GET_SOURCES,
            { workspaceSlug }
          );
          
          if (result.data) {
            setSources(result.data.sources || []);
          } else if (result.error) {
            console.error("Error fetching sources:", result.error);
            toast.error(`Failed to load sources: ${result.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL sources query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient, workspaceSlug]);

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - ${workspace?.name || 'Dashboard'} | ${t("sources.title") || "Sources"}`} />
      <Content.Title
        title={t("sources.title") || "Sources"}
        subtitle={t("sources.subtitle") || "Manage your data sources"}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title={t("sources.list.title") || "Data Sources"}>
            {sources && sources.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.name") || "Name"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.type") || "Type"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.status") || "Status"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.lastSync") || "Last Sync"}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.records") || "Records"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sources.map((source, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${workspaceSlug}/sources/${source._id}`} className="text-sm font-medium text-gray-900 underline"> 
                            {source.name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 capitalize"> 
                            {source.sourceType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium capitalize ${source.status === 'active' ? 'text-green-600' : 'text-gray-500'}`}> 
                            {source.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900"> 
                            {source.lastSync ? new Date(source.lastSync).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }) : 'Not available'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900"> 
                            {source.recordsCount || 'Not available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : isLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2.5"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            ) : (
              <p className="">{t("sources.empty") || "No sources configured yet."}</p>
            )}
          </Card.Body>
          <Card.Footer>
            <Button
              background="Pink"
              border="Light"
              disabled={isLoading}
              onClick={() => window.location.href = `/${workspaceSlug}/sources/add`}
            >
              {t("sources.list.action.addSource") || "Add Source"}
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
}