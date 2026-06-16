const User = require('../models/User');
const syncService = require('../jobs/sync');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const register = catchAsync(async (req, res) => {
  const { handle } = req.body;
  if (!handle || handle.trim() === '') {
    return res.status(400).json({ error: 'CF handle is required' });
  }

  const normalizedHandle = syncService.normalizeHandle(handle);
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
  const result = await syncService.syncUser(normalizedHandle);
  res.json({
    success: true,
    message: `Synced ${result.submissionsStored} submissions`,
    data: result
  });
});

const getUser = catchAsync(async (req, res) => {
  const handle = syncService.normalizeHandle(req.params.handle);
  const user = await User.findOne({ cf_handle: handle })
    .select('_id cf_handle createdAt last_synced_at sync_status');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ success: true, data: user });
});

module.exports = { register, getUser };
