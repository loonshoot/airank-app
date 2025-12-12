import { validateSession } from '@/config/api-validation';
import {
  updatePermissions,
  getMemberById,
  getMemberByWorkspaceAndEmail
} from '@/prisma/services/membership';
import { getSession } from 'next-auth/react';
import { TeamRole, InvitationStatus } from '@prisma/client';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'PUT') {
    await validateSession(req, res);

    const session = await getSession({ req });
    if (!session?.user?.email) {
      return res.status(401).json({ errors: { error: { msg: 'Unauthorized' } } });
    }

    const { memberId, permissions } = req.body;

    if (!memberId) {
      return res.status(400).json({ errors: { error: { msg: 'Member ID is required' } } });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ errors: { error: { msg: 'Permissions must be an array' } } });
    }

    // Get the member being updated
    const targetMember = await getMemberById(memberId);
    if (!targetMember) {
      return res.status(404).json({ errors: { error: { msg: 'Member not found' } } });
    }

    // Get the current user's member record for this workspace
    const currentUserMember = await getMemberByWorkspaceAndEmail(
      targetMember.workspaceId,
      session.user.email
    );

    if (!currentUserMember) {
      return res.status(403).json({ errors: { error: { msg: 'You are not a member of this workspace' } } });
    }

    // Check if current user has permission to update members
    const hasUpdatePermission =
      currentUserMember.teamRole === TeamRole.OWNER ||
      currentUserMember.permissions?.includes('mutation:updateMember');

    if (!hasUpdatePermission) {
      return res.status(403).json({ errors: { error: { msg: 'You do not have permission to update members' } } });
    }

    // Cannot update your own permissions
    if (targetMember.email === session.user.email) {
      return res.status(403).json({ errors: { error: { msg: 'You cannot update your own permissions' } } });
    }

    // Cannot update OWNER members unless you're also an owner
    if (targetMember.teamRole === TeamRole.OWNER && currentUserMember.teamRole !== TeamRole.OWNER) {
      return res.status(403).json({ errors: { error: { msg: 'You cannot update an owner\'s permissions' } } });
    }

    // Cannot update pending members
    if (targetMember.status === InvitationStatus.PENDING) {
      return res.status(403).json({ errors: { error: { msg: 'Cannot update permissions for pending members' } } });
    }

    const updatedMember = await updatePermissions(memberId, permissions);
    res.status(200).json({ data: { member: updatedMember } });
  } else {
    res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
