const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/leave  (employee: own; manager: team; admin: all)
router.get('/', async (req, res) => {
  try {
    const { status, employeeId } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'employee') {
      clauses.push('lr.employee_id = ?');
      params.push(req.user.employeeId);
    } else if (req.user.role === 'manager') {
      clauses.push('e.manager_id = ?');
      params.push(req.user.employeeId);
    }
    if (employeeId) {
      clauses.push('lr.employee_id = ?');
      params.push(employeeId);
    }
    if (status) {
      clauses.push('lr.status = ?');
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT lr.*, u.name AS employee_name, e.employee_code
       FROM leave_requests lr
       JOIN employees e ON e.employee_id = lr.employee_id
       JOIN users u ON u.user_id = e.user_id
       ${where}
       ORDER BY lr.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch leave requests' });
  }
});

// POST /api/leave  (employee submits leave request)
router.post('/', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;
    if (!leaveType || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ message: 'To date cannot be before from date' });
    }
    const [result] = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [req.user.employeeId, leaveType, fromDate, toDate, reason || null]
    );
    res.status(201).json({ leaveId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to submit leave request' });
  }
});

// PUT /api/leave/:id/decision  (manager/admin approves or rejects)
router.put('/:id/decision', authorize('manager', 'admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { decision } = req.body; // 'Approved' | 'Rejected'
    if (!['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision' });
    }

    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM leave_requests WHERE leave_id = ?', [req.params.id]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Leave request not found' });
    }
    const leave = rows[0];

    await conn.query(
      'UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE leave_id = ?',
      [decision, req.user.employeeId, req.params.id]
    );

    // If approved, mark attendance as Leave for each day in range (skip weekends)
    if (decision === 'Approved') {
      const start = new Date(leave.from_date);
      const end = new Date(leave.to_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day === 0 || day === 6) continue; // skip weekends
        const dateStr = d.toISOString().slice(0, 10);
        await conn.query(
          `INSERT INTO attendance (employee_id, work_date, status)
           VALUES (?, ?, 'Leave')
           ON DUPLICATE KEY UPDATE status = 'Leave', check_in = NULL, check_out = NULL, working_hours = NULL, is_late = 0`,
          [leave.employee_id, dateStr]
        );
      }
    }

    await conn.commit();
    res.json({ message: `Leave request ${decision.toLowerCase()}` });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to process leave decision' });
  } finally {
    conn.release();
  }
});

module.exports = router;
