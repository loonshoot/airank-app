const menu = (workspaceId) => [
  {
    name: 'Workspace',
    menuItems: [
      {
        name: 'common.label.home',
        path: `/${workspaceId}`,
      },
      {
        name: 'common.label.data',
        path: `/${workspaceId}/data`,
      },
      {
        name: 'common.label.sources',
        path: `/${workspaceId}/sources`,
      },
      {
        name: 'common.label.destinations',
        path: `/${workspaceId}/destinations`,
      },
      {
        name: 'common.label.logs',
        path: `/${workspaceId}/logs`,
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