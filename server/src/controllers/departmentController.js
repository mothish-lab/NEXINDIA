const Department = require('../models/Department');
const { createError } = require('../middleware/errorHandler');

async function getDepartments(req, res, next) {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const { name, slaHours, categories, authorityLevel } = req.body;
    if (!name || !slaHours) {
      return res.status(400).json({ success: false, message: 'name and slaHours required' });
    }
    const dept = await Department.create({ name, slaHours, categories: categories || [], authorityLevel: authorityLevel || 'WARD' });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

async function updateDepartment(req, res, next) {
  try {
    const dept = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!dept) return next(createError('Department not found', 404));
    res.json({ success: true, data: dept });
  } catch (err) {
    next(err);
  }
}

module.exports = { getDepartments, createDepartment, updateDepartment };
