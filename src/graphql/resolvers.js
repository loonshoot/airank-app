import dbConnect from '@/lib/mongoose';
import Workspace from '@/models/Workspace';
import Member from '@/models/Member';
import User from '@/models/User';

const resolvers = {
  Query: {
    userWorkspaces: async (_, __, { session }) => {
      if (!session || !session.user) {
        throw new Error('Authentication required');
      }

      await dbConnect();

      // Find memberships where this user is a member with accepted status
      const memberRecords = await Member.find({
        userId: session.user.userId,
        status: 'ACCEPTED',
        deletedAt: null
      }).lean();
      
      if (!memberRecords.length) {
        return [];
      }
      
      // Get workspace IDs from member records
      const workspaceIds = memberRecords.map(member => member.workspaceId);
      
      // Find workspaces by IDs
      const workspaces = await Workspace.find({
        _id: { $in: workspaceIds },
        deletedAt: null
      }).lean();
      
      // Attach creator info to each workspace
      const workspacesWithCreators = await Promise.all(
        workspaces.map(async (workspace) => {
          const creator = await User.findOne({ _id: workspace.creatorId }).lean();
          
          // Get all members for this workspace
          const members = await Member.find({ 
            workspaceId: workspace._id,
            deletedAt: null
          }).lean();
          
          // Get invited by users for each member
          const membersWithInviter = await Promise.all(
            members.map(async (member) => {
              const invitedBy = await User.findOne({ _id: member.inviter }).lean();
              return {
                ...member,
                id: member._id.toString(),
                invitedBy: invitedBy ? {
                  id: invitedBy._id.toString(),
                  name: invitedBy.name,
                  email: invitedBy.email
                } : null
              };
            })
          );
          
          return {
            ...workspace,
            id: workspace._id.toString(),
            creator: creator ? {
              id: creator._id.toString(),
              name: creator.name,
              email: creator.email
            } : null,
            members: membersWithInviter
          };
        })
      );
      
      return workspacesWithCreators;
    },
    
    userInvitations: async (_, __, { session }) => {
      if (!session || !session.user) {
        throw new Error('Authentication required');
      }

      await dbConnect();
      
      // Find pending invitations for this user
      const pendingInvitations = await Member.find({
        userId: session.user.userId,
        status: 'PENDING',
        deletedAt: null
      }).lean();
      
      if (!pendingInvitations.length) {
        return [];
      }
      
      // Prepare invitations with workspace and inviter info
      const invitationsWithDetails = await Promise.all(
        pendingInvitations.map(async (invitation) => {
          // Get workspace details
          const workspace = await Workspace.findOne({ 
            _id: invitation.workspaceId,
            deletedAt: null
          }).lean();
          
          // Get inviter details
          const invitedBy = await User.findOne({ 
            _id: invitation.inviter 
          }).lean();
          
          return {
            ...invitation,
            id: invitation._id.toString(),
            workspace: workspace ? {
              id: workspace._id.toString(),
              name: workspace.name,
              slug: workspace.slug,
              workspaceCode: workspace.workspaceCode,
              inviteCode: workspace.inviteCode
            } : null,
            invitedBy: invitedBy ? {
              id: invitedBy._id.toString(),
              name: invitedBy.name,
              email: invitedBy.email
            } : null
          };
        })
      );
      
      return invitationsWithDetails;
    }
  },
  
  Mutation: {
    acceptInvitation: async (_, { invitationId }, { session }) => {
      if (!session || !session.user) {
        throw new Error('Authentication required');
      }
      
      await dbConnect();
      
      try {
        // Find and update the invitation status
        const invitation = await Member.findOneAndUpdate(
          { 
            _id: invitationId,
            userId: session.user.userId,
            status: 'PENDING',
            deletedAt: null
          },
          { 
            status: 'ACCEPTED',
            joinedAt: new Date()
          },
          { new: true }
        );
        
        if (!invitation) {
          throw new Error('Invitation not found');
        }
        
        return true;
      } catch (error) {
        console.error('Error accepting invitation:', error);
        return false;
      }
    },
    
    declineInvitation: async (_, { invitationId }, { session }) => {
      if (!session || !session.user) {
        throw new Error('Authentication required');
      }
      
      await dbConnect();
      
      try {
        // Find and update the invitation status
        const invitation = await Member.findOneAndUpdate(
          { 
            _id: invitationId,
            userId: session.user.userId,
            status: 'PENDING',
            deletedAt: null
          },
          { 
            status: 'DECLINED'
          },
          { new: true }
        );
        
        if (!invitation) {
          throw new Error('Invitation not found');
        }
        
        return true;
      } catch (error) {
        console.error('Error declining invitation:', error);
        return false;
      }
    }
  }
};

export default resolvers; 