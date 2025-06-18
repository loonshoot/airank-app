import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useTranslation } from 'react-i18next';

const CREATE_QUERY_MUTATION = gql`
  mutation CreateQuery($workspaceId: String!, $name: String!, $query: String!) {
    createQuery(workspaceId: $workspaceId, name: $name, query: $query) {
      _id
      name
      query
    }
  }
`;

const RUN_QUERY_MUTATION = gql`
  mutation RunQuery($workspaceId: String!, $query: String!) {
    runQuery(workspaceId: $workspaceId, query: $query) {
      results
    }
  }
`;

const QueryBuilder = ({ workspace }) => {
  const { t } = useTranslation();
  const [queryText, setQueryText] = useState('');
  const [results, setResults] = useState([]);
  const [createQuery] = useMutation(CREATE_QUERY_MUTATION);
  const [runQuery] = useMutation(RUN_QUERY_MUTATION);

  const handleCreateQuery = async () => {
    try {
      const { data } = await createQuery({
        variables: {
          workspaceId: workspace.id,
          name: 'New Query',
          query: queryText,
        },
      });
      console.log('Query created:', data.createQuery);
    } catch (error) {
      console.error('Error creating query:', error);
    }
  };

  const handleRunQuery = async () => {
    try {
      const { data } = await runQuery({
        variables: {
          workspaceId: workspace.id,
          query: queryText,
        },
      });
      setResults(data.runQuery.results);
    } catch (error) {
      console.error('Error running query:', error);
    }
  };

  return (
    <Card>
      <Card.Body title={t("data.queries.new")}>  
        <textarea
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          className="w-full h-40 p-2 border"
          placeholder="Write your MongoDB query here..."
        />
        <div className="flex justify-end mt-4">
          <Button onClick={handleRunQuery} className="mr-2">
            {t("data.queries.actions.run")}
          </Button>
          <Button onClick={handleCreateQuery}>
            {t("data.queries.actions.save")}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="mt-4">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(results[0]).map((key) => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index}>
                    {Object.values(result).map((value, i) => (
                      <td key={i} className="px-6 py-4 whitespace-nowrap">
                        {JSON.stringify(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QueryBuilder; 