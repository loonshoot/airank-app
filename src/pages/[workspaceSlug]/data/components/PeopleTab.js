import { useState } from 'react';
import { useQuery, gql } from '@apollo/client';
import Card from '@/components/Card';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/router';

const GET_PEOPLE = gql`
  query GetPeople($workspaceSlug: String!, $collectionName: String!, $page: Int!, $limit: Int!) {
    objects(workspaceSlug: $workspaceSlug, collectionName: $collectionName, page: $page, limit: $limit) {
      objects {
        _id
        data
      }
      totalCount
      hasNextPage
    }
  }
`;

const PEOPLE_COLLECTION = 'source_people_collection';

const PeopleTab = ({ workspace, token }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [paginationPage, setPaginationPage] = useState(1);
  const [paginationRange, setPaginationRange] = useState(20);

  if (!workspace?.slug) {
    return null;
  }

  const { loading, error, data } = useQuery(GET_PEOPLE, {
    variables: {
      workspaceSlug: workspace.slug,
      collectionName: "people",
      page: paginationPage,
      limit: paginationRange
    },
    context: {
      headers: {
        authorization: token
      }
    }
  });

  const handlePageChange = (page) => {
    setPaginationPage(page);
  };

  const handleRangeChange = (range) => {
    setPaginationPage(1);
    setPaginationRange(range);
  };

  const handleRowClick = (objectId) => {
    router.push(`/${workspace.slug}/data/people/${objectId}`);
  };

  const getPhoneNumber = (objectData) => {
    if (objectData.phoneNumbers && objectData.phoneNumbers.length > 0) {
      return objectData.phoneNumbers[0].number;
    }
    return "";
  };

  if (loading) return <div>{t("common.loading")}</div>;
  if (error) return <div>{t("common.error")}</div>;

  const objects = data?.objects?.objects || [];
  const totalCount = data?.objects?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / paginationRange);

  return (
    <Card>
      {objects && objects.length > 0 ? (
        <Card.Body 
          title={t("data.people.browse.title")}
          subtitle={t("data.people.browse.subtitle")}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("data.people.fields.firstName")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("data.people.fields.lastName")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("data.people.fields.email")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("data.people.fields.phone")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {objects.map((object) => (
                <tr 
                  key={object._id}
                  onClick={() => handleRowClick(object._id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {object.data.firstName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {object.data.lastName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {object.data.emailAddress || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getPhoneNumber(object.data) || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Body>
      ) : (
        <Card.Body 
          title={t("data.empty.title")}
          subtitle={t("data.empty.subtitle")}
        />
      )}
      <Card.Footer>
        <div className="mb-4">
          <label className="block text-sm font-medium text-light">{t("common.label.paginationPage")}</label>
          <div className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button 
                key={page} 
                onClick={() => handlePageChange(page)} 
                className={`text-sm font-medium ${paginationPage === page ? 'underline' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-light">{t("common.label.paginationRange")}</label>
          <select 
            value={paginationRange} 
            onChange={(e) => handleRangeChange(parseInt(e.target.value))} 
            className="block w-full mt-1 text-dark"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default PeopleTab; 