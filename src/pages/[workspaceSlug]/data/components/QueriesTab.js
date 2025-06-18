import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/router';

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

const CREATE_QUERY = gql`
  mutation CreateQuery($workspaceId: String!, $name: String!, $query: String!) {
    createQuery(workspaceId: $workspaceId, name: $name, query: $query) {
      _id
      name
    }
  }
`;

const QueriesTab = ({ workspace, token, initialQueriesData }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const { t } = useTranslation();
  const router = useRouter();

  // Add early return if workspace is not available
  if (!workspace?.id) {
    return null;
  }

  const [createQuery] = useMutation(CREATE_QUERY, {
    context: {
      headers: {
        authorization: `${token}`
      }
    }
  });

  const { loading, error, data } = useQuery(QUERIES_QUERY, {
    variables: { 
      workspaceId: workspace.id,
      page,
      limit
    },
    context: {
      headers: {
        authorization: `${token}`
      }
    },
    // Skip the initial query if we have initialQueriesData and we're on page 1
    skip: page === 1 && initialQueriesData
  });

  // Use initialQueriesData for first page, otherwise use data from query
  const queriesData = page === 1 ? initialQueriesData : data;
  const queries = queriesData?.queries?.queries || [];
  const totalCount = queriesData?.queries?.totalCount || 0;
  const hasMore = queriesData?.queries?.hasMore || false;

  if (loading) return <div>Loading...</div>;
  if (error && page === 1) return <div>Error loading queries</div>;

  return (
    <Card>
      <Card.Body title={t("data.queries.title")}>
        <div className="mb-4 flex justify-end">
        </div>

        {queries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.name")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.description")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.schedule")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.createdBy")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.lastModified")}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("data.queries.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queries.map((query) => (
                  <tr key={query._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/${encodeURI(workspace.slug)}/data/queries/${encodeURI(query._id)}`}
                        className="text-sm font-medium text-gray-900 underline"
                      >
                        {query.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {query.description || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {query.schedule || 'One-off'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {query.createdBy}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {new Date(query.updatedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={`/${encodeURI(workspace.slug)}/data/queries/${encodeURI(query._id)}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        {t("data.queries.actions.edit")}
                      </a>
                      <a href={`/${encodeURI(workspace.slug)}/data/queries/${encodeURI(query._id)}/run`} className="text-green-600 hover:text-green-900">
                        {t("data.queries.actions.run")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">{t("data.queries.empty")}</p>
          </div>
        )}

        {queries.length > 0 && (
          <div className="mt-4 flex justify-between items-center">
            <Button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t("data.queries.pagination.previous")}
            </Button>
            <span className="text-sm text-gray-700">
              {t("data.queries.pagination.page")} {page} of {Math.ceil(totalCount / limit)}
            </span>
            <Button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore}
            >
              {t("data.queries.pagination.next")}
            </Button>
          </div>
        )}
      </Card.Body>
      <Card.Footer>
        <Button
          background="Pink"
          border="Light"
          disabled={loading}
          onClick={async () => {
            try {
              const now = new Date();
              const formattedTime = now.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: 'numeric',
                hour12: true 
              });
              const formattedDate = now.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
              });
              
              const { data } = await createQuery({
                variables: {
                  workspaceId: workspace.id,
                  name: t("data.queries.newQueryName", { time: formattedTime, date: formattedDate }),
                  query: "db.collection('queries').find().toArray()"
                },
                context: {
                  headers: {
                    authorization: `${token}`
                  }
                }
              });
              router.push(`/${encodeURI(workspace.slug)}/data/queries/${encodeURI(data.createQuery._id)}`);
            } catch (err) {
              console.error('Error creating query:', err);
            }
          }}
        >
          {t("data.queries.new")}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default QueriesTab; 