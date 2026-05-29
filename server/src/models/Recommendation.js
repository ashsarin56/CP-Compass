const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  batch: { type: mongoose.Schema.Types.Mixed, required: true },
  generated_at: { type: Date, default: Date.now },
  valid_until: { type: Date, default: null },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

recommendationSchema.index({ user_id: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
