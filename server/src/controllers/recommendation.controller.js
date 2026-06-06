const recommendationService = require('../services/recommendationEngine');

async function getRecommendations(req, res) {
  try {
    const user = await recommendationService.findUserOrThrow(req.params.handle);
    const batch = await recommendationService.generateRecommendations(user._id);
    res.json({ success: true, data: batch });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { getRecommendations };
