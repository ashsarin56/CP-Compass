const User = require('../models/User');
const { syncUser } = require('../jobs/sync');

async function register(req, res) {
  const { handle } = req.body;
  if (!handle || handle.trim() === '') {
    return res.status(400).json({ error: 'CF handle is required' });
  }

  const normalizedHandle = handle.trim().toUpperCase();
  try {
    const existing = await User.findOne({ cf_handle: normalizedHandle });

    if (existing) {
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

      if (
        existing.sync_status === 'complete' &&
        existing.last_synced_at &&
        new Date(existing.last_synced_at) > sixHoursAgo
      ) {
        console.log(`${normalizedHandle} already synced recently, skipping`);
        return res.json({
          success: true,
          message: 'Profile already synced recently',
          data: { userId: existing._id, handle: normalizedHandle, cached: true }
        });
      }
    }
    const result = await syncUser(normalizedHandle);
    res.json({
      success: true,
      message: `Synced ${result.submissionsStored} submissions`,
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getUser(req, res) {
  const handle = req.params.handle.toUpperCase();
  try {
    const user = await User.findOne({ cf_handle: handle })
      .select('_id cf_handle createdAt last_synced_at sync_status');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, getUser };
