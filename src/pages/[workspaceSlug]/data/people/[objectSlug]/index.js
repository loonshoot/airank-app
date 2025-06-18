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

const GET_PERSON = gql`
  query GetPerson($workspaceSlug: String!, $collectionName: String!, $objectId: String!) {
    objects(workspaceSlug: $workspaceSlug, collectionName: $collectionName, objectId: $objectId) {
      objects {
        _id
        data
      }
    }
  }
`;

const PersonDetail = ({ workspace, data }) => {
  const { t } = useTranslation();
  const router = useRouter();

  if (!workspace || !data) {
    return <div>{t("common.loading")}</div>;
  }

  const person = data?.objects?.objects?.[0];

  if (!person) {
    return <div>{t("common.notFound")}</div>;
  }

  const personData = person.data;

  return (
    <AccountLayout>
      <Meta title={`${personData.firstName} ${personData.lastName} - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Link href={`/${workspace.slug}/data?tab=people`}>
        <p className="mb-4 inline-block text-blue-600 hover:text-blue-800">
          &lt; {t("data.collection.header.back")}
        </p>
      </Link>
      <Content.Title
        title={`${personData.firstName} ${personData.lastName}`}
        subtitle={personData.emailAddress}
      />
      <Content.Divider />
      
      {/* Profile Image */}
      <div className="mb-8 pl-4">
        <div className="relative w-48 h-48">
          <Image
            src="https://cdn.getoutrun.com/app/portraits/placeholder-portrait.jpg"
            alt={`${personData.firstName} ${personData.lastName}`}
            layout="fill"
            objectFit="cover"
          />
        </div>
      </div>

      <Content.Container>
        <div className="grid grid-cols-2 gap-6">
          {/* Core Details Card */}
          <Card>
            <Card.Body title={t("data.people.browse.title")}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.people.fields.firstName")}</h3>
                  <p className="mt-1 text-sm text-gray-900">{personData.firstName || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.people.fields.lastName")}</h3>
                  <p className="mt-1 text-sm text-gray-900">{personData.lastName || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.people.fields.email")}</h3>
                  <p className="mt-1 text-sm text-gray-900">{personData.emailAddress || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t("data.people.fields.phone")}</h3>
                  <p className="mt-1 text-sm text-gray-900">
                    {(personData.phoneNumbers && personData.phoneNumbers.length > 0) 
                      ? personData.phoneNumbers[0].number 
                      : '-'}
                  </p>
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
      query: GET_PERSON,
      variables: {
        workspaceSlug: context.params.workspaceSlug,
        collectionName: "people",
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

export default PersonDetail; 