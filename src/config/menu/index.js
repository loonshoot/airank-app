const menu = (workspaceId) => [
  {
    name: 'Workspace',
    menuItems: [
      {
        name: 'common.label.dashboard',
        path: `/${workspaceId}`,
      },
      {
        name: 'common.label.prompts',
        path: `/${workspaceId}/prompts`,
      },
      {
        name: 'common.label.brands',
        path: `/${workspaceId}/brands`,
      },
      {
        name: 'common.label.models',
        path: `/${workspaceId}/models`,
      },
    ],
  },
  {
    name: 'Admin',
    menuItems: [
      {
        name: 'settings.team.management',
        path: `/${workspaceId}/settings/team`,
      },
      {
        name: 'settings.workspace.billing',
        path: `/${workspaceId}/settings/billing`,
      },
    ],
  },
  {
    name: 'User',
    menuItems: [
      {
        name: 'common.label.account',
        path: `/account/settings`,
      },
      {
        name: 'common.label.logout',
        onClick: 'logOut'
      }
    ],
  },
];

// Menu for when no workspace is selected - only shows user options
const noWorkspaceMenu = () => [
  {
    name: 'User',
    menuItems: [
      {
        name: 'common.label.account',
        path: `/account/settings`,
      },
      {
        name: 'common.label.logout',
        onClick: 'logOut'
      }
    ],
  },
];

export default menu;
export { noWorkspaceMenu };