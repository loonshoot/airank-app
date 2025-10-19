'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeQuery, executeMutation } from '@/graphql/operations';
import {
  GET_BILLING_PROFILES,
  ADD_BILLING_PROFILE_MEMBER,
  UPDATE_BILLING_PROFILE_MEMBER,
  REMOVE_BILLING_PROFILE_MEMBER,
  DELETE_BILLING_PROFILE
} from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import { TrashIcon, UserPlusIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function BillingProfilesPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteErrorModal, setShowDeleteErrorModal] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');
  const [currentMember, setCurrentMember] = useState(null);

  // Add member form state
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPermissions, setNewMemberPermissions] = useState({
    attach: false,
    modify: false,
    delete: false
  });
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Edit member form state
  const [editPermissions, setEditPermissions] = useState({
    attach: false,
    modify: false,
    delete: false
  });
  const [isUpdatingMember, setIsUpdatingMember] = useState(false);

  // Delete state
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const result = await executeQuery(graphqlClient, GET_BILLING_PROFILES);

      if (result.data?.billingProfiles) {
        const profilesList = result.data.billingProfiles;
        setProfiles(profilesList);

        // Set first profile as selected by default
        if (profilesList.length > 0 && !selectedProfileId) {
          setSelectedProfileId(profilesList[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching billing profiles:', err);
      toast.error('Failed to load billing profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [graphqlClient]);

  const selectedProfile = profiles.find(p => p._id === selectedProfileId);

  const getCurrentUserMember = (profile) => {
    const userId = workspace?.creatorId;
    return profile.members?.find(m => m.userId === userId);
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setIsAddingMember(true);
    try {
      const result = await executeMutation(
        graphqlClient,
        ADD_BILLING_PROFILE_MEMBER,
        {
          billingProfileId: selectedProfileId,
          email: newMemberEmail,
          permissions: newMemberPermissions
        }
      );

      if (result.data?.addBillingProfileMember) {
        toast.success('Member added successfully');
        setShowAddMemberModal(false);
        setNewMemberEmail('');
        setNewMemberPermissions({ attach: false, modify: false, delete: false });
        fetchProfiles();
      }
    } catch (err) {
      console.error('Error adding member:', err);
      toast.error(err.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateMember = async () => {
    setIsUpdatingMember(true);
    try {
      // Strip __typename from permissions (added by Apollo Client)
      const cleanPermissions = {
        attach: editPermissions.attach,
        modify: editPermissions.modify,
        delete: editPermissions.delete
      };

      const result = await executeMutation(
        graphqlClient,
        UPDATE_BILLING_PROFILE_MEMBER,
        {
          billingProfileId: selectedProfileId,
          userId: currentMember.userId,
          permissions: cleanPermissions
        }
      );

      if (result.data?.updateBillingProfileMember) {
        toast.success('Member permissions updated');
        setShowEditMemberModal(false);
        setCurrentMember(null);
        fetchProfiles();
      }
    } catch (err) {
      console.error('Error updating member:', err);
      toast.error(err.message || 'Failed to update member');
    } finally {
      setIsUpdatingMember(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Remove ${member.email || member.userId} from ${selectedProfile.name}?`)) {
      return;
    }

    setIsRemovingMember(true);
    try {
      const result = await executeMutation(
        graphqlClient,
        REMOVE_BILLING_PROFILE_MEMBER,
        {
          billingProfileId: selectedProfileId,
          userId: member.userId
        }
      );

      if (result.data?.removeBillingProfileMember) {
        toast.success('Member removed successfully');
        fetchProfiles();
      }
    } catch (err) {
      console.error('Error removing member:', err);
      toast.error(err.message || 'Failed to remove member');
    } finally {
      setIsRemovingMember(false);
    }
  };

  const handleDeleteProfile = async () => {
    setIsDeletingProfile(true);
    try {
      const result = await executeMutation(
        graphqlClient,
        DELETE_BILLING_PROFILE,
        {
          billingProfileId: selectedProfileId
        }
      );

      if (result.error) {
        throw new Error(result.error.message || 'Failed to delete billing profile');
      }

      if (result.data?.deleteBillingProfile) {
        toast.success('Billing profile deleted successfully');
        setShowDeleteModal(false);
        setSelectedProfileId(null);
        fetchProfiles();
      } else {
        toast.error('Failed to delete billing profile');
      }
    } catch (err) {
      console.error('Error deleting profile:', err);
      toast.error(err.message || 'Failed to delete billing profile');
      setShowDeleteModal(false);
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const openEditMemberModal = (member) => {
    setCurrentMember(member);
    setEditPermissions(member.permissions);
    setShowEditMemberModal(true);
  };

  const isDefaultProfile = (profile) => {
    return workspace?.defaultBillingProfileId === profile._id;
  };

  if (isLoading) {
    return (
      <AccountLayout routerType="app">
        <Meta title="Manage Billing Profiles" />
        <Content.Title
          title="Manage Billing Profiles"
          subtitle="Manage members and permissions for your billing profiles"
        />
        <Content.Divider />
        <Content.Container>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (profiles.length === 0) {
    return (
      <AccountLayout routerType="app">
        <Meta title="Manage Billing Profiles" />
        <Content.Title
          title="Manage Billing Profiles"
          subtitle="Manage members and permissions for your billing profiles"
        />
        <Content.Divider />
        <Content.Container>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No billing profiles found</p>
            </CardContent>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  const currentUserMember = selectedProfile ? getCurrentUserMember(selectedProfile) : null;
  const canModify = currentUserMember?.permissions?.modify || false;
  const canDelete = currentUserMember?.permissions?.delete || false;
  const isDefault = selectedProfile ? isDefaultProfile(selectedProfile) : false;

  return (
    <AccountLayout routerType="app">
      <Meta title="Manage Billing Profiles" />
      <Content.Title
        title="Manage Billing Profiles"
        subtitle="Manage members and permissions for your billing profiles"
      />
      <Content.Divider />
      <Content.Container>
        <div className="space-y-6">
          {/* Profile Selector Card */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle>Select Billing Profile</CardTitle>
              <CardDescription>
                Choose a billing profile to manage its members and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedProfileId || ''}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                {profiles.map((profile) => {
                  const isDefault = isDefaultProfile(profile);
                  return (
                    <option key={profile._id} value={profile._id}>
                      {profile.name} {isDefault ? '(Default)' : ''} - {profile.currentPlan}
                    </option>
                  );
                })}
              </select>
            </CardContent>
          </Card>

          {/* Selected Profile Details */}
          {selectedProfile && (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedProfile.name}
                      {isDefault && (
                        <span className="text-xs bg-zinc-800 text-gray-400 px-2 py-1 rounded">
                          Default
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Plan: <span className="capitalize">{selectedProfile.currentPlan}</span>
                      {' • '}
                      {selectedProfile.members?.length || 0} member(s)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isDefault && canDelete && (
                      <button
                        onClick={async () => {
                          // Check if profile is attached to any workspaces
                          try {
                            const allWorkspacesResult = await executeQuery(
                              graphqlClient,
                              GET_USER_WORKSPACES
                            );

                            const attachedWorkspaces = allWorkspacesResult.data?.workspaces?.filter(
                              w => w.billingProfileId === selectedProfileId
                            ) || [];

                            if (attachedWorkspaces.length > 0) {
                              const workspaceNames = attachedWorkspaces.map(w => w.name).join(', ');
                              setDeleteErrorMessage(
                                `This billing profile is currently attached to ${attachedWorkspaces.length} workspace(s): ${workspaceNames}. Please switch those workspaces to a different billing profile before deleting this one.`
                              );
                              setShowDeleteErrorModal(true);
                            } else {
                              setShowDeleteModal(true);
                            }
                          } catch (error) {
                            console.error('Error checking workspaces:', error);
                            setShowDeleteModal(true);
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete billing profile"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isDefault ? (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400">
                      This is your workspace's default billing profile. Default profiles cannot have members managed or be deleted.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Members</h4>
                      {canModify && (
                        <Button
                          background="Green"
                          border="Light"
                          onClick={() => setShowAddMemberModal(true)}
                        >
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {selectedProfile.members?.map((member) => {
                        const isLastMember = selectedProfile.members.length === 1;
                        const isCurrentUser = member.userId === workspace?.creatorId;
                        const canEditThisMember = canModify && !(isLastMember && isCurrentUser);
                        const canRemoveThisMember = canModify && !isLastMember;

                        return (
                          <div
                            key={member._id}
                            className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{member.email || member.userId}</p>
                              <div className="flex gap-2 mt-1">
                                {member.permissions?.attach && (
                                  <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded">
                                    Attach
                                  </span>
                                )}
                                {member.permissions?.modify && (
                                  <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded">
                                    Modify
                                  </span>
                                )}
                                {member.permissions?.delete && (
                                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">
                                    Delete
                                  </span>
                                )}
                              </div>
                            </div>
                            {(canEditThisMember || canRemoveThisMember) && (
                              <div className="flex gap-2">
                                {canEditThisMember && (
                                  <button
                                    onClick={() => openEditMemberModal(member)}
                                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit member permissions"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                )}
                                {canRemoveThisMember && (
                                  <button
                                    onClick={() => handleRemoveMember(member)}
                                    disabled={isRemovingMember}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Remove member"
                                  >
                                    <TrashIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {(!selectedProfile.members || selectedProfile.members.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No members yet. Add members to share this billing profile.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Add Member</h3>
              <p className="text-sm text-gray-400 mb-4">
                Add a user by their email address. They must already have an account.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Permissions</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMemberPermissions.attach}
                        onChange={(e) => setNewMemberPermissions({
                          ...newMemberPermissions,
                          attach: e.target.checked
                        })}
                        className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                      />
                      <span className="text-sm">Attach - Can attach profile to workspaces</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMemberPermissions.modify}
                        onChange={(e) => setNewMemberPermissions({
                          ...newMemberPermissions,
                          modify: e.target.checked
                        })}
                        className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                      />
                      <span className="text-sm">Modify - Can manage members and settings</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newMemberPermissions.delete}
                        onChange={(e) => setNewMemberPermissions({
                          ...newMemberPermissions,
                          delete: e.target.checked
                        })}
                        className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                      />
                      <span className="text-sm">Delete - Can delete billing profile</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  background="Green"
                  border="Light"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setNewMemberEmail('');
                    setNewMemberPermissions({ attach: false, modify: false, delete: false });
                  }}
                  disabled={isAddingMember}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  background="Green"
                  border="Light"
                  onClick={handleAddMember}
                  disabled={isAddingMember}
                  className="flex-1"
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Member Modal */}
        {showEditMemberModal && currentMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Edit Member Permissions</h3>
              <p className="text-sm text-gray-400 mb-4">
                Update permissions for {currentMember.email || currentMember.userId}
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editPermissions.attach}
                    onChange={(e) => setEditPermissions({
                      ...editPermissions,
                      attach: e.target.checked
                    })}
                    className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                  />
                  <span className="text-sm">Attach - Can attach profile to workspaces</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editPermissions.modify}
                    onChange={(e) => setEditPermissions({
                      ...editPermissions,
                      modify: e.target.checked
                    })}
                    className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                  />
                  <span className="text-sm">Modify - Can manage members and settings</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editPermissions.delete}
                    onChange={(e) => setEditPermissions({
                      ...editPermissions,
                      delete: e.target.checked
                    })}
                    className="rounded border-zinc-700 bg-zinc-900 text-green-600 focus:ring-green-600"
                  />
                  <span className="text-sm">Delete - Can delete billing profile</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  background="Green"
                  border="Light"
                  onClick={() => {
                    setShowEditMemberModal(false);
                    setCurrentMember(null);
                  }}
                  disabled={isUpdatingMember}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  background="Green"
                  border="Light"
                  onClick={handleUpdateMember}
                  disabled={isUpdatingMember}
                  className="flex-1"
                >
                  {isUpdatingMember ? 'Updating...' : 'Update Permissions'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Profile Modal */}
        {showDeleteModal && selectedProfile && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-red-500">Delete Billing Profile</h3>
              <p className="text-sm text-gray-400 mb-4">
                Are you sure you want to delete <strong>{selectedProfile.name}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 mt-6">
                <Button
                  background="Green"
                  border="Light"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeletingProfile}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  background="Red"
                  border="Light"
                  onClick={handleDeleteProfile}
                  disabled={isDeletingProfile}
                  className="flex-1"
                >
                  {isDeletingProfile ? 'Deleting...' : 'Delete Profile'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Error Modal */}
        {showDeleteErrorModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold mb-4 text-red-500">Cannot Delete Billing Profile</h3>
              <p className="text-sm text-gray-400 mb-6">
                {deleteErrorMessage}
              </p>

              <Button
                background="Green"
                border="Light"
                onClick={() => setShowDeleteErrorModal(false)}
                width="Full"
              >
                Got it
              </Button>
            </div>
          </div>
        )}
      </Content.Container>
    </AccountLayout>
  );
}
