import { useEffect } from 'react';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { useWorkspaces } from '@/hooks/data/index';

const Workspace = () => {
  const { workspace, setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const { data } = useWorkspaces();

  useEffect(() => {
    const fetchWorkspace = () => {
      const pathSegments = window.location.pathname.split('/').filter(segment => segment !== ''); // Split URL path and remove empty segments
      const firstFolder = pathSegments[0]; // Get the first folder after the domain

      if (data && firstFolder) {
        const matchingWorkspace = data.workspaces.find(workspace => workspace.slug === firstFolder); // Find matching workspace
        if (matchingWorkspace) {
          setWorkspace(matchingWorkspace); // Set matching workspace as active
        }
      }
    };

    fetchWorkspace();
  }, [data, setWorkspace]);

  if (!workspace) {
    // Handle case when workspace is not available yet
    return <div>Loading...</div>;
  }

  return (
    <AccountLayout>
      <Meta title={`AI Rank - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Content.Title
        title={t("load.title")}
        subtitle={t("load.subtitle")}
      />
      <Content.Divider />
      <Content.Container />
    </AccountLayout>
  );
};

export default Workspace;
