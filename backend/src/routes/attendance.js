const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const LATE_THRESHOLD = '09:30:00'; // check-in after this time is marked Late

function toHMS(date) {
  return date.toTimeString().split(' ')[0];
}

// POST /api/attendance/checkin
router.post('/checkin', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ message: 'No employee profile linked to this account' });

    const today = new Date().toISOString().slice(0, 10);
    const now = toHMS(new Date());

    const [existing] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?',
      [employeeId, today]
    );

    if (existing.length > 0 && existing[0].check_in) {
      return res.status(409).json({ message: 'Already checked in today' });
    }

    const isLate = now > LATE_THRESHOLD;
    const status = isLate ? 'Late' : 'Present';

    if (existing.length > 0) {
      await pool.query(
        'UPDATE attendance SET check_in = ?, status = ?, is_late = ? WHERE attendance_id = ?',
        [now, status, isLate ? 1 : 0, existing[0].attendance_id]
      );
    } else {
      await pool.query(
        'INSERT INTO attendance (employee_id, work_date, check_in, status, is_late) VALUES (?, ?, ?, ?, ?)',
        [employeeId, today, now, status, isLate ? 1 : 0]
      );
    }

    res.json({ message: 'Checked in successfully', checkIn: now, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to check in' });
  }
});

// POST /api/attendance/checkout
router.post('/checkout', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().slice(0, 10);
    const now = toHMS(new Date());

    const [existing] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?',
      [employeeId, today]
    );

    if (existing.length === 0 || !existing[0].check_in) {
      return res.status(400).json({ message: 'You must check in before checking out' });
    }
    if (existing[0].check_out) {
      return res.status(409).json({ message: 'Already checked out today' });
    }

    const checkInTime = new Date(`${today}T${existing[0].check_in}`);
    const checkOutTime = new Date(`${today}T${now}`);
    const hours = Math.max(0, (checkOutTime - checkInTime) / 1000 / 3600);

    await pool.query(
      'UPDATE attendance SET check_out = ?, working_hours = ? WHERE attendance_id = ?',
      [now, hours.toFixed(2), existing[0].attendance_id]
    );

    res.json({ message: 'Checked out successfully', checkOut: now, workingHours: hours.toFixed(2) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to check out' });
  }
});

// GET /api/attendance/me?month=&year=
router.get('/me', async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const { month, year } = req.query;
    let query = 'SELECT * FROM attendance WHERE employee_id = ?';
    const params = [employeeId];
    if (month && year) {
      query += ' AND MONTH(work_date) = ? AND YEAR(work_date) = ?';
      params.push(month, year);
    }
    query += ' ORDER BY work_date DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/today  (today's own status)
router.get('/today', async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?',
      [employeeId, today]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch today attendance' });
  }
});

// GET /api/attendance  (admin/manager view, with filters)
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { date, employeeId, departmentId } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'manager') {
      clauses.push('e.manager_id = ?');
      params.push(req.user.employeeId);
    }
    if (date) {
      clauses.push('a.work_date = ?');
      params.push(date);
    }
    if (employeeId) {
      clauses.push('a.employee_id = ?');
      params.push(employeeId);
    }
    if (departmentId) {
      clauses.push('e.department_id = ?');
      params.push(departmentId);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT a.*, u.name AS employee_name, e.employee_code, d.name AS department_name
       FROM attendance a
       JOIN employees e ON e.employee_id = a.employee_id
       JOIN users u ON u.user_id = e.user_id
       JOIN departments d ON d.department_id = e.department_id
       ${where}
       ORDER BY a.work_date DESC, u.name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch attendance records' });
  }
});

module.exports = router;
