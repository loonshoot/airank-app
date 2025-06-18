import Card from '@/components/Card';
import { formatBytes } from '@/lib/utils/formatters';

const AllDataTab = ({ workspace, allCollections }) => {

  return (
    <Card>
      <Card.Body title="Data Collections">
        {allCollections && allCollections.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Collection Name
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
                    Avg Document Size
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Size
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allCollections.map((collection, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/${encodeURI(workspace.slug)}/data/${encodeURI(collection.name)}`} 
                        className="text-sm font-medium text-gray-900 underline"
                      >
                        {collection.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {collection.sourceId ? (
                          <a 
                            href={`/${encodeURI(workspace.slug)}/sources/${encodeURI(collection.sourceId)}`} 
                            className="text-sm font-medium text-gray-900 underline"
                          >
                            {collection.sourceName}
                          </a>
                        ) : (
                          collection.sourceName
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {collection.sourceType}
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
                        {formatBytes(collection.size)}
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

export default AllDataTab; 