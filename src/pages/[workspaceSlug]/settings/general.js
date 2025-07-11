import { useState } from 'react';
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';
import { useTranslation } from "react-i18next";
import { useQuery, gql } from '@apollo/client';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import { useWorkspace } from '@/providers/workspace';

import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { AccountLayout } from '@/layouts/index';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import TabNavigation from '@/components/TabNavigation';

import WorkspaceTab from './components/WorkspaceTab';
import TeamTab from './components/TeamTab';
import BillingTab from './components/BillingTab';

const sourcesQuery = gql`
query Sources($workspaceSlug: String!) {
  sources(workspaceSlug: $workspaceSlug) {
    name
    _id
    sourceType
    status
  }
}
`;

const General = ({ isTeamOwner, workspace: serverWorkspace, sources, token }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const { workspace: contextWorkspace } = useWorkspace();
  
  // Use server workspace if available, otherwise fall back to context workspace
  const workspace = serverWorkspace || contextWorkspace;

  const tabs = [
    { id: 'general', label: t("common.label.workspace") || "Workspace" },
    { id: 'team', label: t("settings.team.management") || "Team" },
    { id: 'billing', label: t("settings.workspace.billing") || "Billing" }
  ];

  return (
    <AccountLayout>
      <Meta title={`AI Rank - ${workspace?.name || 'Workspace'} | Settings`} />
      <Content.Title
        title={t("settings.workspace.settings")}
        subtitle={t("settings.general.workspace.description")}
      />
      <Content.Divider />
      <Content.Container>
        <TabNavigation tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />

        {!workspace ? (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Workspace Not Found</h3>
            <p className="text-muted-foreground">
              The workspace you're trying to access doesn't exist or you don't have permission to view it.
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'general' && <WorkspaceTab workspace={workspace} isTeamOwner={isTeamOwner} />}
            {activeTab === 'team' && <TeamTab workspace={workspace} isTeamOwner={isTeamOwner} />}
            {activeTab === 'billing' && <BillingTab />}
          </>
        )}
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  const token = await getToken({ req: context.req, secret: process.env.NEXTAUTH_SECRET, raw: true });
  const apolloClient = initializeApollo();
  let isTeamOwner = false;
  let workspace = null;

  if (session) {
    workspace = await getWorkspace(
      session.user.userId,
      session.user.email,
      context.params.workspaceSlug
    );

    if (workspace) {
      isTeamOwner = isWorkspaceOwner(session.user.email, workspace);
      workspace.inviteLink = `${
        process.env.APP_URL
      }/teams/invite?code=${encodeURI(workspace.inviteCode)}`;

      // Fetch sources data
      const { data } = await apolloClient.query({
        query: sourcesQuery,
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
          isTeamOwner,
          workspace,
          sources: data.sources,
          token,
        },
      });
    }
  }

  return {
    props: {
      isTeamOwner,
      workspace,
      sources: [],
      token: null,
    },
  };
};

export default General;
