const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  cf_handle: { type: String, required: true, unique: true },
  email: { type: String, default: null },
  password_hash: { type: String, default: null },
  sync_status: { type: String, default: 'pending' },
  last_synced_at: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
