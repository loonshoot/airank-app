import { useEffect, useState } from 'react';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/router';
import Card from '@/components/Card/index';
import Link from 'next/link';
import Button from '@/components/Button/index';
import { gql } from '@apollo/client';
import { getSession } from "next-auth/react";
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";

const GET_OBJECTS = gql`
  query GetObjects($workspaceSlug: String!, $collectionName: String!, $page: Int!, $limit: Int!) {
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

const Collection = ({ workspace, data }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { collectionSlug } = router.query;
  const [paginationPage, setPaginationPage] = useState(1);
  const [paginationRange, setPaginationRange] = useState(20);

  const handlePageChange = (page) => {
    setPaginationPage(page);
  };

  const handleRangeChange = (range) => {
    setPaginationPage(1);
    setPaginationRange(range);
  };

  const getFirstLineValue = (objectData) => {
    const firstLineLabels = ["name", "firstname", "email", "lastname", "title", "url"];
    for (let label of firstLineLabels) {
      if (objectData[label]) {
        return objectData[label];
      }
    }
    return "";
  };

  if (!workspace || !data) {
    return <div>{t("common.loading")}</div>;
  }

  const totalPages = Math.ceil((data?.objects?.totalCount || 0) / paginationRange);
  const objects = data?.objects?.objects || [];

  return (
    <AccountLayout>
      <Meta title={`Outrun - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Link href={`/${workspace.slug}/data`}>
        <p className="mb-4 inline-block text-blue-600 hover:text-blue-800">
          &lt; {t("data.collection.header.back")}
        </p>
      </Link>
      <Content.Title
        title={t("data.title")}
        subtitle={t("data.subtitle")}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          {objects && objects.length > 0 ? (
            <Card.Body 
              title={t("data.collection.browse.title")}
              subtitle={t("data.collection.browse.subtitle")}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("data.collection.objects.id")}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t("data.collection.objects.firstLine")}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {objects.map((object) => (
                    <tr key={object._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link href={`/${workspace.slug}/data/${collectionSlug}/${object._id}`} className="underline">
                          {object._id}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getFirstLineValue(object.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Body>
          ) : (
            <Card.Body 
              title={t("data.empty.title")}
              subtitle={t("data.empty.subtitle")}
            >
              <Link href={`/${workspace.slug}/sources/`}>
                <Button
                  background="Pink"
                  border="Light"
                >
                  {t("data.empty.button")}
                </Button>
              </Link>
            </Card.Body>
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
  const apolloClient = initializeApollo(null, context);

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

    if (!workspace) {
      return {
        notFound: true,
      };
    }

    // Fetch objects data
    const { data } = await apolloClient.query({
      query: GET_OBJECTS,
      variables: {
        workspaceSlug: context.params.workspaceSlug,
        collectionName: context.params.collectionSlug,
        page: 1,
        limit: 20
      },
      context: {
        headers: {
          authorization: token,
        },
      },
    });

    return addApolloState(apolloClient, {
      props: {
        session,
        workspace,
        data
      },
    });
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return {
      props: {
        session,
        workspace: null,
        data: null
      },
    };
  }
};

export default Collection;
