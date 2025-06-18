import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  userCode: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String
  },
  email: {
    type: String,
    unique: true
  },
  emailVerified: {
    type: Date
  },
  image: {
    type: String
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

// Create a compound index for userCode and email
UserSchema.index({ userCode: 1, email: 1 }, { unique: true });

// Check if the model is already defined
export default mongoose.models.User || mongoose.model('User', UserSchema, 'users'); 