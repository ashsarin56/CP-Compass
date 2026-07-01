const recommendationService = require('../services/recommendationEngine');
const catchAsync = require('../utils/catchAsync');

const getRecommendations = catchAsync(async (req, res) => {
  const user = await recommendationService.findUserOrThrow(req.params.handle);
  const batch = await recommendationService.generateRecommendations(user._id);
  res.json({ success: true, data: batch });
});

const markSolved = catchAsync(async (req, res) => {
  const { problemId } = req.body;
  const user = await recommendationService.findUserOrThrow(req.params.handle);
  const result = await recommendationService.verifySolvedAndReplace(
    user._id, user.cf_handle, problemId
  );
  res.json({ success: true, data: result });
});

module.exports = { getRecommendations, markSolved };
