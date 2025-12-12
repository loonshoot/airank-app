import Card from '@/components/Card/index';

const WorkspaceTab = ({ workspace = {} }) => {
  return (
    <Card>
      <Card.Body
        title="Workspace Settings"
        subtitle="Configure your workspace settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Workspace Name</label>
            <div className="text-white">{workspace.name || 'N/A'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Workspace Slug</label>
            <div className="text-white">{workspace.slug || 'N/A'}</div>
          </div>
          {workspace.inviteLink && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Invite Link</label>
              <div className="text-white break-all">{workspace.inviteLink}</div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default WorkspaceTab;
