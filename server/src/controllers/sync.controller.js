const syncService = require('../jobs/sync');

async function triggerSync(req, res) {
  try {
    const user = await syncService.findUserOrThrow(req.params.handle);
    const result = await syncService.syncUser(user.cf_handle);
    res.json({ success: true, data: result });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ error: err.message });
  }
}

module.exports = { triggerSync };
