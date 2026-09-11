/**
 * Notification Service — Create and manage notifications.
 */

const Notification = require('../models/Notification');

/**
 * Create a notification for a user.
 */
async function createNotification({ userId, issueId, type, message }) {
  try {
    await Notification.create({ userId, issueId, type, message });
  } catch (err) {
    console.error('Notification creation error:', err.message);
  }
}

/**
 * Department-to-category mapping.
 * Returns the best department ObjectId for a given category.
 */
async function getDepartmentForCategory(category) {
  const Department = require('../models/Department');
  const dept = await Department.findOne({
    categories: category,
    isActive: true,
  });
  return dept ? dept._id : null;
}

module.exports = { createNotification, getDepartmentForCategory };
