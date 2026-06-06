const User = require('../models/User');
const { generateRecommendations } = require('../services/recommendationEngine');

async function getRecommendations(req, res) {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const batch = await generateRecommendations(user._id);
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getRecommendations };
