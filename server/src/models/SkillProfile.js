const mongoose = require('mongoose');

const skillProfileSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  global_estimate: { 
    type: Number, 
    default: 0 
  },
  tag_skills: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} 
  },
  weakness_vector: { 
    type: mongoose.Schema.Types.Mixed, 
    default: [] 
  },
  computed_at: { 
    type: Date, 
    default: Date.now 
  },
  data_window_start: { 
    type: Date, 
    default: null 
  },
  data_window_end: { 
    type: Date, 
    default: null 
  },
  submission_count: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

module.exports = mongoose.model('SkillProfile', skillProfileSchema);
