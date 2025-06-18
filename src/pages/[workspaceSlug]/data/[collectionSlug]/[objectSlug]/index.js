import { useEffect, useState } from 'react';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { useRouter } from 'next/router';
import Card from '@/components/Card/index';
import Link from 'next/link';
import { gql } from '@apollo/client';
import { getSession } from "next-auth/react";
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";

const GET_OBJECT = gql`
  query GetObject($workspaceSlug: String!, $collectionName: String!, $objectId: String!) {
    objects(workspaceSlug: $workspaceSlug, collectionName: $collectionName, objectId: $objectId) {
      objects {
        _id
        data
      }
    }
  }
`;

const ObjectDetail = ({ workspace, data }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { collectionSlug } = router.query;

  if (!workspace || !data) {
    return <div>{t("common.loading")}</div>;
  }

  const object = data?.objects?.objects?.[0];

  if (!object) {
    return <div>{t("common.notFound")}</div>;
  }

  return (
    <AccountLayout>
      <Meta title={`Outrun - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Link href={`/${workspace.slug}/data/${collectionSlug}/`}>
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
          <Card.Body 
            title={t("data.collection.object.title")}
          >
            <div className="bg-light text-dark p-4 relative">
              <pre>
                <code>{JSON.stringify(object.data, null, 2)}</code>
              </pre> 
            </div>
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

    // Fetch object data
    const { data } = await apolloClient.query({
      query: GET_OBJECT,
      variables: {
        workspaceSlug: context.params.workspaceSlug,
        collectionName: context.params.collectionSlug,
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

export default ObjectDetail;
