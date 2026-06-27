const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cf_handle: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String
  },
  password_hash: {
    type: String
  },
  google_id: {
    type: String
  },
  avatar_url: {
    type: String
  },
  auth_provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  sync_status: {
    type: String,
    default: 'pending'
  },
  last_synced_at: {
    type: Date,
    default: null
  }
}, { timestamps: true });

userSchema.index({ google_id: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);
