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
        name: 'settings.workspace.settings',
        path: `/${workspaceId}/settings/general`,
      },
      {
        name: 'settings.workspace.billing',
        path: `/${workspaceId}/settings/billing`,
      }
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

export default menu;