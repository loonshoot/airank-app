import { useEffect, useState } from 'react';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/router';
import Card from '@/components/Card/index';
import Link from 'next/link';
import { gql } from '@apollo/client';
import { getSession } from "next-auth/react";
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import Image from 'next/image';

const GET_ORGANIZATION = gql`
  query GetOrganization($workspaceSlug: String!, $collectionName: String!, $objectId: String!) {
    objects(workspaceSlug: $workspaceSlug, collectionName: $collectionName, objectId: $objectId) {
      objects {
        _id
        data
      }
    }
  }
`;

const OrganizationDetail = ({ workspace, data }) => {
  const { t } = useTranslation();
  const router = useRouter();

  if (!workspace || !data) {
    return <div>{t("common.loading")}</div>;
  }

  const organization = data?.objects?.objects?.[0];

  if (!organization) {
    return <div>{t("common.notFound")}</div>;
  }

  const orgData = organization.data;

  return (
    <AccountLayout>
      <Meta title={`${orgData.companyName} - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Link href={`/${workspace.slug}/data?tab=organizations`}>
        <p className="mb-4 inline-block text-blue-600 hover:text-blue-800">
          &lt; {t("data.collection.header.back")}
        </p>
      </Link>
      <Content.Title
        title={orgData.companyName}
        subtitle={orgData.domain}
      />
      <Content.Divider />
      
      {/* Organization Logo */}
      {orgData.domain && (
        <div className="mb-8 pl-4">
          <div className="relative w-48 h-48">
            <Image
              src={`https://img.logo.dev/${orgData.domain}?token=pk_L_HjTB4-TOew6uf4SpRdfg`}
              alt={orgData.companyName}
              layout="fill"
              objectFit="contain"
            />
          </div>
        </div>
      )}

      <Content.Container>
        <div className="grid grid-cols-2 gap-6">
          {/* Core Details Card */}
          <Card>
            <Card.Body title={t("data.organizations.browse.title")}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.organizations.fields.companyName")}</h3>
                  <p className="mt-1 text-sm text-gray-900">{orgData.companyName || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.organizations.fields.domain")}</h3>
                  <p className="mt-1 text-sm text-gray-900">{orgData.domain || '-'}</p>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Event Stream Card */}
          <Card>
            <Card.Body title="Event Stream">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Event stream data will appear here</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>

      {/* Logo.dev Attribution */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <a href="https://logo.dev" className="hover:text-gray-700" target="_blank" rel="noopener noreferrer" alt="Logo API">
          Logos provided by Logo.dev
        </a>
      </div>
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

    const { data } = await apolloClient.query({
      query: GET_ORGANIZATION,
      variables: {
        workspaceSlug: context.params.workspaceSlug,
        collectionName: "organizations",
        objectId: context.params.objectSlug
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

export default OrganizationDetail; 