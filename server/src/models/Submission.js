const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cf_submission_id: { type: Number, required: true, unique: true },
  problem_id: { type: String, required: true },
  problem_name: { type: String, default: null },
  problem_rating: { type: Number, default: null },
  problem_tags: { type: [String], default: [] },
  verdict: { type: String, required: true },
  contest_id: { type: Number, default: null },
  is_contest_submission: { type: Boolean, default: false },
  submitted_at: { type: Date, default: null }
}, { timestamps: true });

// Indexes matching what we had in Postgres
submissionSchema.index({ user_id: 1 });
submissionSchema.index({ user_id: 1, verdict: 1 });
submissionSchema.index({ problem_tags: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
