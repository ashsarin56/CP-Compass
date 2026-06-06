const mongoose = require('mongoose');

const feedbackEventSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem_id: {
    type: String, 
    required: true
  },
  batch_id: {
    type: String, 
    default: null
  },
  outcome: {
    type: String, 
    required: true
  },
  attempts: {
    type: Number, 
    default: 1
  },
  source: {
    type: String,
    default: 'practice'
  }
}, { timestamps: true });

feedbackEventSchema.index({ user_id: 1 });
feedbackEventSchema.index({ problem_id: 1 });

module.exports = mongoose.model('FeedbackEvent', feedbackEventSchema);
