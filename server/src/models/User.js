const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cf_handle: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    default: null
  },
  password_hash: {
    type: String,
    default: null
  },
  google_id: {
    type: String,
    default: null
  },
  avatar_url: {
    type: String,
    default: null
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
