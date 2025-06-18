import { useEffect, useState } from 'react';
import { useTranslation } from "react-i18next";
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import { useQuery, gql } from '@apollo/client';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import TabNavigation from '@/components/TabNavigation';
import AllDataTab from './components/AllDataTab';
import QueriesTab from './components/QueriesTab';
import PeopleTab from './components/PeopleTab';
import OrganizationsTab from './components/OrganizationsTab';
import { useRouter } from 'next/router';

const COLLECTIONS_QUERY = gql`
  query CombinedData($workspaceSlug: String!) {
    collections(workspaceSlug: $workspaceSlug) {
      name
      storageSize
      size
      avgObjSize
      documentCount
    }
    sources(workspaceSlug: $workspaceSlug) {
      _id
      name
      sourceType
      status
    }
  }
`;

const QUERIES_QUERY = gql`
  query GetQueries($workspaceId: String!, $page: Int, $limit: Int) {
    queries(workspaceId: $workspaceId, page: $page, limit: $limit) {
      queries {
        _id
        name
        description
        query
        schedule
        createdAt
        updatedAt
        createdBy
        lastModifiedBy
      }
      totalCount
      hasMore
    }
  }
`;

const DataPage = ({ workspace, initialData, initialQueriesData, token }) => {
  const { t } = useTranslation();
  const [allCollections, setAllCollections] = useState([]);
  const [activeTab, setActiveTab] = useState('allData');
  const router = useRouter();
  const tab = router.query.tab || 'allData';

  // Add early return for loading state
  if (!workspace) {
    return (
      <AccountLayout>
        <Meta title="Loading..." />
        <div>Loading...</div>
      </AccountLayout>
    );
  }

  // Use the initial data for the first render
  const { data: collectionsData } = useQuery(COLLECTIONS_QUERY, {
    variables: { workspaceSlug: workspace.slug },
    context: { headers: { authorization: token } },
    // Skip the query if we have initial data
    skip: !!initialData,
  });

  const data = initialData || collectionsData;

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  useEffect(() => {
    if (data?.collections && data?.sources) {
      const enhancedCollections = data.collections.map(collection => {
        const sourceIdMatch = collection.name.match(/^source_([^_]+)_/);
        if (sourceIdMatch) {
          const sourceId = sourceIdMatch[1];
          const source = data.sources.find(s => s._id === sourceId);
          if (source) {
            return {
              ...collection,
              sourceName: source.name,
              sourceType: source.sourceType,
              sourceId: source._id
            };
          }
        }
        return {
          ...collection,
          sourceName: 'Unknown',
          sourceType: 'Unknown',
          sourceId: null
        };
      });

      const sortedCollections = enhancedCollections.sort((a, b) => {
        if (a.sourceName === 'Unknown' && b.sourceName !== 'Unknown') return 1;
        if (a.sourceName !== 'Unknown' && b.sourceName === 'Unknown') return -1;
        return a.sourceName.localeCompare(b.sourceName);
      });

      setAllCollections(sortedCollections);
    }
  }, [data]);

  if (!workspace) {
    return <div>Loading...</div>;
  }

  const tabs = [
    { id: 'allData', label: t("data.navigation.allData") },
    { id: 'queries', label: t("data.navigation.queries") },
    { id: 'people', label: t("data.navigation.people") },
    { id: 'organizations', label: t("data.navigation.organizations") }
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    router.push({
      pathname: `/[workspaceSlug]/data`,
      query: { ...router.query, tab: tabId, workspaceSlug: workspace.slug }
    }, undefined, { shallow: true });
  };

  return (
    <AccountLayout>
      <Meta title={`Outrun - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Content.Title
        title={t("data.title")}
        subtitle={t("data.subtitle")}
      />
      <Content.Container>
        <TabNavigation tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />

        {activeTab === 'allData' && (
          <AllDataTab workspace={workspace} allCollections={allCollections} />
        )}

        {activeTab === 'queries' && (
          <QueriesTab 
            workspace={workspace} 
            token={token} 
            initialQueriesData={initialQueriesData}
          />
        )}

        {activeTab === 'people' && (
          <PeopleTab workspace={workspace} token={token} />
        )}

        {activeTab === 'organizations' && (
          <OrganizationsTab workspace={workspace} token={token} />
        )}
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    };
  }

  const token = await getToken({ req: context.req, secret: process.env.NEXTAUTH_SECRET, raw: true });
  const apolloClient = initializeApollo();

  try {
    let workspace = null;
    if (session) {
      workspace = await getWorkspace(
        session.user.userId,
        session.user.email,
        context.params.workspaceSlug
      );
    }

    // Fetch collections and sources data
    const { data: initialData } = await apolloClient.query({
      query: COLLECTIONS_QUERY,
      variables: { workspaceSlug: context.params.workspaceSlug },
      context: {
        headers: { authorization: token }
      }
    });

    // Fetch initial queries data with pagination
    const { data: initialQueriesData } = await apolloClient.query({
      query: QUERIES_QUERY,
      variables: { 
        workspaceId: workspace.id,
        page: 1,
        limit: 15
      },
      context: {
        headers: { authorization: token }
      }
    });

    return addApolloState(apolloClient, {
      props: {
        workspace,
        initialData,
        initialQueriesData,
        token
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      notFound: true
    };
  }
};

export default DataPage;