import { useQuery, gql } from '@apollo/client';
import Card from '@/components/Card';
import { formatBytes } from '@/lib/utils/formatters';

const COLLECTIONS_QUERY = gql`
  query Collections($workspaceSlug: String!) {
    collections(workspaceSlug: $workspaceSlug) {
      name
      storageSize
      size
      avgObjSize
      documentCount
      source
      sourceType
    }
  }
`;

const CollectionsTab = ({ workspace }) => {
  if (!workspace?.slug) {
    return null;
  }

  const { loading, error, data } = useQuery(COLLECTIONS_QUERY, {
    variables: { workspaceSlug: workspace.slug }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading collections</div>;

  const collections = data?.collections || [];

  return (
    <Card>
      <Card.Body title="Collections">
        {collections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Doc Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documents
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {collections.map((collection) => (
                  <tr key={collection.name}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/${encodeURI(workspace.slug)}/data/collections/${encodeURI(collection.name)}`}
                        className="text-sm font-medium text-gray-900 underline"
                      >
                        {collection.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {collection.source || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {collection.sourceType || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatBytes(collection.storageSize)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatBytes(collection.avgObjSize)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {collection.documentCount.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No collections found</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CollectionsTab; 