import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useTranslation } from "react-i18next";
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Toggle from '@/components/Toggle';
import { useRouter } from 'next/router';
import debounce from 'lodash/debounce';
import { toast } from 'react-hot-toast';

const GET_QUERY = gql`
  query GetQuery($workspaceId: String!, $queryId: String!) {
    queries(workspaceId: $workspaceId, queryId: $queryId) {
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

const UPDATE_QUERY = gql`
  mutation UpdateQuery($workspaceId: String!, $id: ID!, $name: String, $query: String) {
    updateQuery(workspaceId: $workspaceId, id: $id, name: $name, query: $query) {
      _id
      name
      query
    }
  }
`;

const RUN_QUERY = gql`
  mutation RunQuery($workspaceId: String!, $query: String!) {
    runQuery(workspaceId: $workspaceId, query: $query) {
      results
      count
    }
  }
`;

const DEFAULT_QUERY = "db.collection('queries').find().toArray()";

const QueryEditor = ({ workspace, token, queryId }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const resultsRef = useRef(null);
  const [queryName, setQueryName] = useState('');
  const [queryContent, setQueryContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isQueryPanelVisible, setIsQueryPanelVisible] = useState(true);

  const { loading, error, data } = useQuery(GET_QUERY, {
    variables: { 
      workspaceId: workspace.id,
      queryId
    },
    context: {
      headers: {
        authorization: `${token}`
      }
    }
  });

  const [updateQuery] = useMutation(UPDATE_QUERY, {
    context: {
      headers: {
        authorization: `${token}`
      }
    }
  });

  const [runQuery] = useMutation(RUN_QUERY, {
    context: {
      headers: {
        authorization: `${token}`
      }
    }
  });

  // Initialize form with query data and set visibility
  useEffect(() => {
    if (data?.queries?.queries?.[0]) {
      const savedQuery = data.queries.queries[0];
      setQueryName(savedQuery.name);
      setQueryContent(savedQuery.query);
      // Only hide panel by default if it's not the default query
      if (savedQuery.query.trim() !== DEFAULT_QUERY) {
        setIsQueryPanelVisible(false);
      }
    }
  }, [data]);

  // Run the initial query when queryContent is set
  useEffect(() => {
    if (queryContent && !hasUnsavedChanges) {
      handleRunQuery();
    }
  }, [queryContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced function to update query name
  const debouncedUpdateName = debounce(async (newName) => {
    try {
      await updateQuery({
        variables: {
          workspaceId: workspace.id,
          id: queryId,
          name: newName
        }
      });
    } catch (err) {
      console.error('Error updating query name:', err);
    }
  }, 5000);

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setQueryName(newName);
    debouncedUpdateName(newName);
  };

  const handleQueryChange = (e) => {
    setQueryContent(e.target.value);
    setHasUnsavedChanges(true);
  };

  const handleSaveQuery = async () => {
    try {
      await updateQuery({
        variables: {
          workspaceId: workspace.id,
          id: queryId,
          query: queryContent
        }
      });
      setHasUnsavedChanges(false);
      // Run the query after successful save
      await handleRunQuery();
    } catch (err) {
      console.error('Error updating query:', err);
    }
  };

  const handleRunQuery = async () => {
    try {
      setIsRunning(true);
      setQueryResults(null);
      
      const { data } = await runQuery({
        variables: {
          workspaceId: workspace.id,
          query: queryContent.trim()
        }
      });
      
      if (data?.runQuery?.results) {
        const results = typeof data.runQuery.results === 'string' 
          ? JSON.parse(data.runQuery.results) 
          : data.runQuery.results;
        setQueryResults(results);
        
        // Simpler scroll handling
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error running query:', err);
      toast.error(`Query error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const renderResultsTable = () => {
    if (!queryResults || !Array.isArray(queryResults) || queryResults.length === 0) return null;

    const columns = Object.keys(queryResults[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th 
                  key={column}
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {queryResults.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {JSON.stringify(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading query</div>;

  return (
    <AccountLayout>
      <Meta title={`AI Rank - ${workspace.name} | Edit Query`} />
      <Content.Title
        title={t("data.queries.edit.title")}
        subtitle={t("data.queries.edit.subtitle")}
      />
      <Content.Container>
        <div className="flex justify-end mb-4">
          <Toggle
            checked={isQueryPanelVisible}
            onChange={(e) => setIsQueryPanelVisible(e.target.checked)}
            label={t("data.queries.labels.showEditor")}
          />
        </div>

        {isQueryPanelVisible && (
          <Card>
            <Card.Body title="">
              <div className="flex flex-col space-y-5">
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("data.queries.labels.name")}
                  </label>
                  <input
                    type="text"
                    value={queryName}
                    onChange={handleNameChange}
                    className="w-full px-3 py-2 border-2 bg-dark"
                    placeholder={t("data.queries.placeholders.name")}
                  />
                </div>
                
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-bold text-light">
                    {t("data.queries.labels.query")}
                  </label>
                  <textarea
                    rows={15}
                    value={queryContent}
                    onChange={handleQueryChange}
                    className="w-full px-3 py-2 border-2 font-mono bg-dark"
                    placeholder={t("data.queries.placeholders.query")}
                  />
                  {hasUnsavedChanges && (
                    <small className="text-yellow-400">
                      {t("data.queries.messages.unsavedChanges")}
                    </small>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-4">
                <div className="flex-1"></div>
                <Button
                  background="Green"
                  border="Light"
                  disabled={isRunning}
                  onClick={handleRunQuery}
                >
                  {isRunning ? t("data.queries.actions.running") : t("data.queries.actions.run")}
                </Button>
                <Button
                  background="Pink"
                  border="Light"
                  disabled={!hasUnsavedChanges}
                  onClick={handleSaveQuery}
                >
                  {t("data.queries.actions.save")}
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {queryResults && (
          <div ref={resultsRef} className="scroll-mt-24">
            <Card>
              <Card.Body
                title={t("data.queries.labels.results")}
                subtitle={t("data.queries.labels.rowsReturned", { count: queryResults.length })}
              >
                {renderResultsTable()}
              </Card.Body>
            </Card>
          </div>
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

    return addApolloState(apolloClient, {
      props: {
        workspace,
        token,
        queryId: context.params.queryId
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      notFound: true
    };
  }
};

export default QueryEditor; 