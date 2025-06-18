import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  workspaceCode: {
    type: String,
    required: true,
    unique: true
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  creatorId: {
    type: String,
    required: true
  },
  chargebeeSubscriptionId: {
    type: String
  },
  chargebeeCustomerId: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Check if the model is already defined
export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema, 'workspaces'); 