const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/work-reports  (employee: own; manager: team; admin: all)
router.get('/', async (req, res) => {
  try {
    const { employeeId, from, to } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'employee') {
      clauses.push('wr.employee_id = ?');
      params.push(req.user.employeeId);
    } else if (req.user.role === 'manager') {
      clauses.push('e.manager_id = ?');
      params.push(req.user.employeeId);
      if (employeeId) {
        clauses.push('wr.employee_id = ?');
        params.push(employeeId);
      }
    } else if (employeeId) {
      clauses.push('wr.employee_id = ?');
      params.push(employeeId);
    }

    if (from) {
      clauses.push('wr.report_date >= ?');
      params.push(from);
    }
    if (to) {
      clauses.push('wr.report_date <= ?');
      params.push(to);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT wr.*, u.name AS employee_name, e.employee_code
       FROM work_reports wr
       JOIN employees e ON e.employee_id = wr.employee_id
       JOIN users u ON u.user_id = e.user_id
       ${where}
       ORDER BY wr.report_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch work reports' });
  }
});

// POST /api/work-reports  (employee submits own daily report)
router.post('/', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const { reportDate, workCompleted, hoursWorked, taskStatus, remarks } = req.body;
    if (!reportDate || !workCompleted) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await pool.query(
      `INSERT INTO work_reports (employee_id, report_date, work_completed, hours_worked, task_status, remarks)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE work_completed = VALUES(work_completed), hours_worked = VALUES(hours_worked),
         task_status = VALUES(task_status), remarks = VALUES(remarks)`,
      [req.user.employeeId, reportDate, workCompleted, hoursWorked || 0, taskStatus || 'In Progress', remarks || null]
    );
    res.status(201).json({ message: 'Work report submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit work report' });
  }
});

module.exports = router;
