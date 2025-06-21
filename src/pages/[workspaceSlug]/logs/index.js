import { useEffect, useState } from 'react';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { AccountLayout } from '@/layouts/index';
import { useTranslation } from "react-i18next";
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import Card from '@/components/Card/index';
import { useQuery, gql } from '@apollo/client';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import Link from 'next/link';

const GET_LOGS = gql`
  query GetLogs($workspaceSlug: String!, $page: Int, $limit: Int, $type: String, $startDate: String, $endDate: String) {
    logs(workspaceSlug: $workspaceSlug, page: $page, limit: $limit, type: $type, startDate: $startDate, endDate: $endDate) {
      logs {
        _id
        type
        userId
        request {
          method
          path
        }
        response {
          statusCode
          error
        }
        timestamp
      }
      totalCount
      hasNextPage
    }
  }
`;

const Logs = ({ workspace, data }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const logs = data?.logs?.logs || [];

  if (!workspace) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <AccountLayout>
      <Meta title={`AI Rank - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Content.Title
        title={t("logs.title") || "Logs"}
        subtitle={t("logs.subtitle") || "View system logs and activity"}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title={t("logs.card.title") || "System Logs"}>
            {logs && logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.id") || "ID"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.timestamp") || "Timestamp"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.type") || "Type"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.method") || "Method"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.path") || "Path"}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("logs.table.status") || "Status"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-gray-50 cursor-pointer">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/${workspace.slug}/data/logs/${log._id}`}>
                            <span className="text-sm font-medium text-blue-600 hover:text-blue-800">
                              {log._id}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {log.timestamp ? new Date(parseInt(log.timestamp)).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'UTC'
                            }) : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.type === 'graphql' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{log.request.method}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{log.request.path}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${
                            log.response.statusCode >= 400 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {log.response.statusCode}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">{t("logs.empty") || "No logs found"}</p>
              </div>
            )}
          </Card.Body>
        </Card>
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
    // Fetch workspace data first
    let workspace = null;
    if (session) {
      workspace = await getWorkspace(
        session.user.userId,
        session.user.email,
        context.params.workspaceSlug
      );
    }

    // Fetch both collections and sources in a single query
    const { data } = await apolloClient.query({
      query: GET_LOGS,
      variables: { workspaceSlug: context.params.workspaceSlug },
      context: {
        headers: {
          authorization: `${token}`
        },
        token
      }
    });

    return addApolloState(apolloClient, {
      props: {
        workspace,
        data,
        session,
        token
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      notFound: true // Or redirect to an error page
    };
  }
};

export default Logs;