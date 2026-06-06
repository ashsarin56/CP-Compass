const User = require('../models/User');
const { syncUser } = require('../jobs/sync');

async function triggerSync(req, res) {
  const handle = req.params.handle.toUpperCase();

  try {
    const user = await User.findOne({ cf_handle: handle });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const result = await syncUser(handle);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { triggerSync };
