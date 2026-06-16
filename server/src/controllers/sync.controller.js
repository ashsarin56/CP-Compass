const syncService = require('../jobs/sync');
const { delCachePattern, delCache } = require('../config/redis');
const catchAsync = require('../utils/catchAsync');

const triggerSync = catchAsync(async (req, res) => {
  const user = await syncService.findUserOrThrow(req.params.handle);
  const result = await syncService.syncUser(user.cf_handle);

  const handle = syncService.normalizeHandle(req.params.handle);
  await delCachePattern(`cf:*:${handle}`);
  await delCache(`profile:${handle}`);
  await delCache(`recommendations:${user._id}`);

  res.json({ success: true, data: result });
});

module.exports = { triggerSync };
