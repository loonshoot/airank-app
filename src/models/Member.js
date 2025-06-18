import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  workspaceId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false
  },
  inviter: {
    type: String,
    required: true
  },
  permissions: {
    type: [String],
    default: [
      "query:members", "query:sources", "query:workspaces", "query:integrations", 
      "query:jobs", "query:tokens", "query:collections", "query:objects", 
      "query:logs", "query:config", "mutation:updateConfig", "mutation:archiveSource", 
      "mutation:registerExternalCredentials", "mutation:createSource", 
      "mutation:deleteExternalCredentials", "mutation:deleteSource", 
      "mutation:registerExternalCredentials", "mutation:scheduleJobs", 
      "mutation:updateSource", "mutation:createStreamRoute", "query:streamRoutes",
      "mutation:createQuery", "mutation:updateQuery", "mutation:deleteQuery", 
      "query:query", "mutation:runQuery"
    ]
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date
  },
  deletedAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ACCEPTED', 'PENDING', 'DECLINED'],
    default: 'PENDING'
  },
  teamRole: {
    type: String,
    enum: ['OWNER', 'ADMIN', 'MEMBER'],
    default: 'MEMBER'
  }
});

// Create a compound index to enforce uniqueness of workspace+userId combination
MemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

// Check if the model is already defined
export default mongoose.models.Member || mongoose.model('Member', MemberSchema, 'members'); 