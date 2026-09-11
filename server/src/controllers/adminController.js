const User = require('../models/User');
const Issue = require('../models/Issue');
const Department = require('../models/Department');
const bcrypt = require('bcryptjs');
const { createError } = require('../middleware/errorHandler');

/**
 * GET /api/admin/users
 */
async function getUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).populate('department', 'name').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);
    res.json({ success: true, data: users, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/users — Admin creates AUTHORITY accounts
 */
async function createUser(req, res, next) {
  try {
    const { name, email, phone, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'name, email, password, role required' });
    }
    if (!['AUTHORITY', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Admin can only create AUTHORITY or ADMIN accounts' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, phone, passwordHash, role, department: department || null });
    res.status(201).json({ success: true, message: 'User created', data: user });
  } catch (err) { next(err); }
}

/**
 * PATCH /api/admin/users/:id
 */
async function updateUser(req, res, next) {
  try {
    const { isActive, department, role } = req.body;
    const updateData = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (department !== undefined) updateData.department = department;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!user) return next(createError('User not found', 404));
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

/**
 * GET /api/admin/analytics
 */
async function getAnalytics(req, res, next) {
  try {
    const [
      totalIssues,
      totalUsers,
      categoryBreakdown,
      departmentBreakdown,
      statusBreakdown,
      escalationCount,
      agingCount,
      avgResolutionTime,
    ] = await Promise.all([
      Issue.countDocuments({ isMaster: true }),
      User.countDocuments(),
      Issue.aggregate([
        { $match: { isMaster: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Issue.aggregate([
        { $match: { isMaster: true, department: { $ne: null } } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmpty: true } },
        { $project: { name: '$dept.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Issue.aggregate([
        { $match: { isMaster: true } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Issue.countDocuments({ isMaster: true, isEscalated: true }),
      Issue.countDocuments({ isMaster: true, isAging: true }),
      Issue.aggregate([
        { $match: { isMaster: true, status: 'RESOLVED', resolvedAt: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgHours: {
              $avg: {
                $divide: [{ $subtract: ['$resolvedAt', '$createdAt'] }, 3600000],
              },
            },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      analytics: {
        totalIssues,
        totalUsers,
        escalationCount,
        agingCount,
        avgResolutionHours: avgResolutionTime[0]?.avgHours?.toFixed(1) || null,
        categoryBreakdown,
        departmentBreakdown,
        statusBreakdown,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { getUsers, createUser, updateUser, getAnalytics };
