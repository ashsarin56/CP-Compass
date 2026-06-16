const recommendationService = require('../services/recommendationEngine');
const catchAsync = require('../utils/catchAsync');

const getRecommendations = catchAsync(async (req, res) => {
  const user = await recommendationService.findUserOrThrow(req.params.handle);
  const batch = await recommendationService.generateRecommendations(user._id);
  res.json({ success: true, data: batch });
});

module.exports = { getRecommendations };
