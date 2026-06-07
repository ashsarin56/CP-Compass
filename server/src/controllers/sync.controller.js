const syncService = require('../jobs/sync');
const { delCachePattern, delCache } = require('../config/redis');

async function triggerSync(req, res) {
  try {
    const user = await syncService.findUserOrThrow(req.params.handle);
    const result = await syncService.syncUser(user.cf_handle);

    const handle = syncService.normalizeHandle(req.params.handle);
    await delCachePattern(`cf:*:${handle}`);
    await delCache(`profile:${handle}`);
    await delCache(`recommendations:${user._id}`);

    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { triggerSync };
