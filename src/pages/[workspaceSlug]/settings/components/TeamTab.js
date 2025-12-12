import { Fragment, useState, useEffect, useCallback } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  EllipsisVerticalIcon,
  XMarkIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import isEmail from 'validator/lib/isEmail';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import { useTranslation } from "react-i18next";
import { useGraphQLClient } from '@/hooks/data/index';
import {
  QUERY_MEMBERS,
  CREATE_MEMBER,
  UPDATE_MEMBER,
  DELETE_MEMBER,
  executeQuery,
  executeMutation
} from '@/graphql/operations';

// Status constants (matching Prisma enum)
const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED'
};

// AIRank-specific permissions
const PERMISSION_OPTIONS = [
  { value: "query:members", label: "View Members" },
  { value: "query:sources", label: "View Sources" },
  { value: "query:workspaces", label: "View Workspaces" },
  { value: "query:integrations", label: "View Integrations" },
  { value: "query:jobs", label: "View Jobs" },
  { value: "query:tokens", label: "View Tokens" },
  { value: "query:collections", label: "View Collections" },
  { value: "query:objects", label: "View Objects" },
  { value: "query:logs", label: "View Logs" },
  { value: "query:config", label: "View Config" },
  { value: "query:streamRoutes", label: "View Stream Routes" },
  { value: "query:query", label: "View Queries" },
  { value: "query:rankings", label: "View Rankings" },
  { value: "query:reports", label: "View Reports" },
  { value: "mutation:updateConfig", label: "Update Config" },
  { value: "mutation:archiveSource", label: "Archive Source" },
  { value: "mutation:createSource", label: "Create Source" },
  { value: "mutation:deleteSource", label: "Delete Source" },
  { value: "mutation:updateSource", label: "Update Source" },
  { value: "mutation:scheduleJobs", label: "Schedule Jobs" },
  { value: "mutation:createStreamRoute", label: "Create Stream Route" },
  { value: "mutation:createQuery", label: "Create Query" },
  { value: "mutation:updateQuery", label: "Update Query" },
  { value: "mutation:deleteQuery", label: "Delete Query" },
  { value: "mutation:runQuery", label: "Run Query" },
  { value: "mutation:createMember", label: "Invite Members" },
  { value: "mutation:updateMember", label: "Update Members" },
  { value: "mutation:deleteMember", label: "Remove Members" },
];

// Role presets for quick permission assignment
const ROLE_PRESETS = {
  VIEWER: {
    label: "Viewer",
    description: "Read-only access to all data",
    permissions: [
      "query:members",
      "query:sources",
      "query:workspaces",
      "query:integrations",
      "query:jobs",
      "query:tokens",
      "query:collections",
      "query:objects",
      "query:logs",
      "query:config",
      "query:streamRoutes",
      "query:query",
      "query:rankings",
      "query:reports"
    ]
  },
  EDITOR: {
    label: "Editor",
    description: "Can view and modify data, but cannot manage members",
    permissions: [
      "query:members",
      "query:sources",
      "query:workspaces",
      "query:integrations",
      "query:jobs",
      "query:tokens",
      "query:collections",
      "query:objects",
      "query:logs",
      "query:config",
      "query:streamRoutes",
      "query:query",
      "query:rankings",
      "query:reports",
      "mutation:updateConfig",
      "mutation:createSource",
      "mutation:updateSource",
      "mutation:createStreamRoute",
      "mutation:createQuery",
      "mutation:updateQuery",
      "mutation:runQuery",
      "mutation:scheduleJobs"
    ]
  },
  ADMIN: {
    label: "Admin",
    description: "Full access including member management",
    permissions: [
      "query:members",
      "query:sources",
      "query:workspaces",
      "query:integrations",
      "query:jobs",
      "query:tokens",
      "query:collections",
      "query:objects",
      "query:logs",
      "query:config",
      "query:streamRoutes",
      "query:query",
      "query:rankings",
      "query:reports",
      "mutation:updateConfig",
      "mutation:archiveSource",
      "mutation:createSource",
      "mutation:deleteSource",
      "mutation:updateSource",
      "mutation:scheduleJobs",
      "mutation:createStreamRoute",
      "mutation:createQuery",
      "mutation:updateQuery",
      "mutation:deleteQuery",
      "mutation:runQuery",
      "mutation:createMember",
      "mutation:updateMember",
      "mutation:deleteMember"
    ]
  }
};

const MEMBERS_TEMPLATE = { email: '' };

const PermissionsModal = ({ isOpen, onClose, member, onSave }) => {
  const [selectedPermissions, setSelectedPermissions] = useState(member?.permissions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member?.permissions) {
      setSelectedPermissions(member.permissions);
    }
  }, [member]);

  const handlePermissionToggle = (permission) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const handleRolePresetSelect = (presetKey) => {
    setSelectedPermissions([...ROLE_PRESETS[presetKey].permissions]);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onSave(member._id, selectedPermissions);
      onClose();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    }
    setIsSubmitting(false);
  };

  const getActivePreset = () => {
    for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
      if (
        preset.permissions.length === selectedPermissions.length &&
        preset.permissions.every(p => selectedPermissions.includes(p))
      ) {
        return key;
      }
    }
    return null;
  };

  const activePreset = getActivePreset();

  return (
    <Modal show={isOpen} title="Edit Member Permissions" toggle={onClose}>
      <div className="space-y-6">
        <div className="text-sm text-gray-400 mb-4">
          Editing permissions for <span className="font-semibold text-white">{member?.email}</span>
        </div>

        {/* Role Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Quick Role Presets</label>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(ROLE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleRolePresetSelect(key)}
                className={`px-3 py-2 text-sm border rounded transition-colors ${
                  activePreset === key
                    ? 'bg-pink-600 border-pink-500 text-white'
                    : 'border-zinc-700 text-gray-300 hover:bg-zinc-800 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium">{preset.label}</div>
              </button>
            ))}
          </div>
          {activePreset && (
            <p className="mt-2 text-xs text-gray-500">
              {ROLE_PRESETS[activePreset].description}
            </p>
          )}
        </div>

        {/* Individual Permissions */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Individual Permissions ({selectedPermissions.length} selected)
          </label>
          <div className="max-h-60 overflow-y-auto border border-zinc-800 rounded p-3 space-y-2 custom-scrollbar">
            {/* Query Permissions */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                View Permissions
              </div>
              {PERMISSION_OPTIONS.filter(p => p.value.startsWith('query:')).map((permission) => (
                <label key={permission.value} className="flex items-center py-1 cursor-pointer hover:bg-zinc-800/50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.value)}
                    onChange={() => handlePermissionToggle(permission.value)}
                    className="mr-3 rounded border-zinc-600 bg-zinc-800 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-300">{permission.label}</span>
                </label>
              ))}
            </div>

            {/* Mutation Permissions */}
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-4 pt-3 border-t border-zinc-800">
                Action Permissions
              </div>
              {PERMISSION_OPTIONS.filter(p => p.value.startsWith('mutation:')).map((permission) => (
                <label key={permission.value} className="flex items-center py-1 cursor-pointer hover:bg-zinc-800/50 px-2 rounded">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission.value)}
                    onChange={() => handlePermissionToggle(permission.value)}
                    className="mr-3 rounded border-zinc-600 bg-zinc-800 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-300">{permission.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
          <Button
            background="Dark"
            border="Light"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            background="Pink"
            border="Light"
            disabled={isSubmitting}
            onClick={handleSave}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const TeamTab = ({ workspace = {} }) => {
  const { t } = useTranslation();

  // GraphQL query for members
  const { data: membersData, loading: isMembersLoading, error: membersError, refetch: refetchMembers } = useQuery(QUERY_MEMBERS, {
    variables: { workspaceSlug: workspace?.slug },
    skip: !workspace?.slug,
    fetchPolicy: 'network-only'
  });

  // Debug logging
  console.log('TeamTab - workspace:', workspace?.slug, 'membersData:', membersData, 'error:', membersError);

  // GraphQL mutations
  const [createMemberMutation] = useMutation(CREATE_MEMBER);
  const [updateMemberMutation] = useMutation(UPDATE_MEMBER);
  const [deleteMemberMutation] = useMutation(DELETE_MEMBER);

  const [isSubmitting, setSubmittingState] = useState(false);
  const [members, setMembers] = useState([{ ...MEMBERS_TEMPLATE }]);
  const [editingMember, setEditingMember] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const validateEmails = members.filter((member) => !isEmail(member.email)).length !== 0;

  if (!workspace) {
    return (
      <Card>
        <Card.Body>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">{t("common.label.loading")}</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Get current user's member record using isCurrentUser flag from GraphQL
  const currentUserMember = membersData?.members?.find(m => m.isCurrentUser);

  // Permissions are derived ONLY from the permissions array - no TeamRole/isOwner fallbacks
  const hasCreateMemberPermission = currentUserMember?.permissions?.includes('mutation:createMember');
  const hasUpdateMemberPermission = currentUserMember?.permissions?.includes('mutation:updateMember');
  const hasDeleteMemberPermission = currentUserMember?.permissions?.includes('mutation:deleteMember');

  const addEmail = () => {
    members.push({ ...MEMBERS_TEMPLATE });
    setMembers([...members]);
  };

  const handleEmailChange = (event, index) => {
    const member = members[index];
    member.email = event.target.value;
    setMembers([...members]);
  };

  // Invite using GraphQL mutation
  const invite = async () => {
    setSubmittingState(true);

    try {
      // Create each member using GraphQL mutation
      for (const member of members) {
        if (isEmail(member.email)) {
          await createMemberMutation({
            variables: {
              input: {
                workspaceId: workspace._id,
                email: member.email,
                permissions: ROLE_PRESETS.VIEWER.permissions // Default to viewer permissions
              }
            }
          });
        }
      }

      setMembers([{ ...MEMBERS_TEMPLATE }]);
      toast.success('Invited team members!');
      refetchMembers();
    } catch (error) {
      console.error('Error inviting members:', error);
      toast.error(error.message || 'Failed to invite members');
    }

    setSubmittingState(false);
  };

  const remove = (index) => {
    members.splice(index, 1);
    setMembers([...members]);
  };

  // Remove member using GraphQL mutation
  const removeMember = async (memberId) => {
    try {
      await deleteMemberMutation({
        variables: {
          input: {
            workspaceId: workspace._id,
            memberId: memberId
          }
        }
      });
      toast.success('Removed team member from workspace!');
      refetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    }
  };

  const openPermissionsModal = (member) => {
    setEditingMember(member);
    setShowPermissionsModal(true);
  };

  const closePermissionsModal = () => {
    setEditingMember(null);
    setShowPermissionsModal(false);
  };

  // Update permissions using GraphQL mutation
  const handleSavePermissions = async (memberId, permissions) => {
    try {
      await updateMemberMutation({
        variables: {
          workspaceId: workspace._id,
          memberId: memberId,
          permissions: permissions
        }
      });
      toast.success('Updated member permissions!');
      refetchMembers();
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error(error.message || 'Failed to update permissions');
      throw error;
    }
  };

  const getPermissionsSummary = (permissions) => {
    if (!permissions || permissions.length === 0) {
      return 'No permissions';
    }

    // Check for role presets
    for (const [key, preset] of Object.entries(ROLE_PRESETS)) {
      if (
        preset.permissions.length === permissions.length &&
        preset.permissions.every(p => permissions.includes(p))
      ) {
        return preset.label;
      }
    }

    return `${permissions.length} permissions`;
  };

  return (
    <>
      {/* Add New Members Card */}
      {hasCreateMemberPermission && (
        <Card>
          <Card.Body
            title="Add New Members"
            subtitle="Invite team members using email address. New members will start with Viewer permissions."
          >
            <div className="flex flex-col space-y-3">
              <div className="flex flex-row space-x-5">
                <div className="flex-1">
                  <label className="text-sm font-bold text-light">
                    {t("common.label.email")}
                  </label>
                </div>
              </div>
              {members.map((member, index) => (
                <div key={index} className="flex flex-row items-center space-x-3">
                  <input
                    className="flex-1 px-3 py-2 border border-zinc-800 bg-zinc-900 rounded focus:border-pink-500 focus:outline-none"
                    disabled={isSubmitting}
                    onChange={(event) => handleEmailChange(event, index)}
                    placeholder="name@email.com"
                    type="text"
                    value={member.email}
                  />
                  {index !== 0 && (
                    <button
                      className="text-red-500 hover:text-red-400 transition-colors"
                      onClick={() => remove(index)}
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
              <div>
                <Button
                  background="Yellow"
                  border="Light"
                  disabled={members.length === 3 || isSubmitting}
                  onClick={addEmail}
                >
                  <span>{t("common.action.addmore")}</span>
                </Button>
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <small className="text-gray-400">
              All invited team members will be set to <strong>Pending</strong> with <strong>Viewer</strong> permissions
            </small>
            <Button
              background="Pink"
              border="Light"
              disabled={validateEmails || isSubmitting}
              onClick={invite}
            >
              {t("common.label.invite")}
            </Button>
          </Card.Footer>
        </Card>
      )}

      {/* Manage Team Members Card */}
      <Card>
        <Card.Body title="Manage Team Members" subtitle="View and manage team member permissions">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-light border-b border-zinc-800">
                <tr>
                  <th className="py-3 text-left text-sm font-medium">Member</th>
                  <th className="py-3 text-left text-sm font-medium">Permissions</th>
                  <th className="py-3 text-left text-sm font-medium">Status</th>
                  <th className="py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/50">
                {isMembersLoading ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      Loading members...
                    </td>
                  </tr>
                ) : membersError ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center">
                      <div className="text-red-500 font-medium">Error loading members</div>
                      <div className="text-red-400 text-xs mt-1">{membersError.message}</div>
                    </td>
                  </tr>
                ) : !membersData?.members?.length ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">
                      No team members found. {!hasCreateMemberPermission && 'You may not have permission to view members.'}
                    </td>
                  </tr>
                ) : (
                  membersData?.members?.map((member, index) => (
                    <tr key={index} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-4">
                        <div className="flex flex-row items-center justify-start space-x-3">
                          <div className="flex flex-col">
                            <h3 className="font-bold text-white">{member.name || 'Pending User'}</h3>
                            <h4 className="text-gray-400 text-xs">{member.email}</h4>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-sm">
                            {getPermissionsSummary(member.permissions)}
                          </span>
                          {hasUpdateMemberPermission &&
                            !member.isCurrentUser &&
                            member.status === InvitationStatus.ACCEPTED && (
                              <button
                                onClick={() => openPermissionsModal(member)}
                                className="text-pink-500 hover:text-pink-400 transition-colors p-1"
                                title="Edit permissions"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          <span
                            className={[
                              'font-mono text-xs px-2 py-1 rounded capitalize',
                              member.status === InvitationStatus.ACCEPTED
                                ? 'bg-green-500/20 text-green-400'
                                : member.status === InvitationStatus.PENDING
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-red-500/20 text-red-400',
                            ].join(' ')}
                          >
                            {member.status?.toLowerCase()}
                          </span>
                          <span className="text-gray-500 text-xs capitalize">
                            {member.teamRole?.toLowerCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        {!member.isCurrentUser &&
                          (hasUpdateMemberPermission || hasDeleteMemberPermission) && (
                            <Menu
                              as="div"
                              className="relative inline-block text-left"
                            >
                              <div>
                                <Menu.Button className="flex items-center justify-center p-2 rounded hover:bg-zinc-800 transition-colors">
                                  <EllipsisVerticalIcon className="w-5 h-5" />
                                </Menu.Button>
                              </div>
                              <Transition
                                as={Fragment}
                                enter="transition ease-out duration-100"
                                enterFrom="transform opacity-0 scale-95"
                                enterTo="transform opacity-100 scale-100"
                                leave="transition ease-in duration-75"
                                leaveFrom="transform opacity-100 scale-100"
                                leaveTo="transform opacity-0 scale-95"
                              >
                                <Menu.Items className="absolute right-0 z-20 mt-2 origin-top-right bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl w-56 overflow-hidden">
                                  <div className="py-1">
                                    {hasUpdateMemberPermission && member.status === InvitationStatus.ACCEPTED && (
                                      <Menu.Item>
                                        {({ active }) => (
                                          <button
                                            className={`flex items-center w-full px-4 py-2 text-sm ${active ? 'bg-zinc-800 text-white' : 'text-gray-300'
                                              }`}
                                            onClick={() => openPermissionsModal(member)}
                                          >
                                            <PencilIcon className="w-4 h-4 mr-2" />
                                            Edit Permissions
                                          </button>
                                        )}
                                      </Menu.Item>
                                    )}
                                    {hasDeleteMemberPermission && (
                                      <Menu.Item>
                                        {({ active }) => (
                                          <button
                                            className={`flex items-center w-full px-4 py-2 text-sm ${active ? 'bg-red-600/20 text-red-400' : 'text-red-500'
                                              }`}
                                            onClick={() => removeMember(member._id)}
                                          >
                                            <XMarkIcon className="w-4 h-4 mr-2" />
                                            Remove Member
                                          </button>
                                        )}
                                      </Menu.Item>
                                    )}
                                  </div>
                                </Menu.Items>
                              </Transition>
                            </Menu>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={showPermissionsModal}
        onClose={closePermissionsModal}
        member={editingMember}
        onSave={handleSavePermissions}
      />
    </>
  );
};

export default TeamTab;
