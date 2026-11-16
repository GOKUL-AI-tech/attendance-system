const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const BASE_SELECT = `
  SELECT e.employee_id, e.employee_code, e.designation, e.phone, e.joining_date,
         e.status, e.manager_id, u.user_id, u.name, u.email, u.role,
         d.department_id, d.name AS department_name,
         m.employee_id AS manager_employee_id, mu.name AS manager_name
  FROM employees e
  JOIN users u ON u.user_id = e.user_id
  JOIN departments d ON d.department_id = e.department_id
  LEFT JOIN employees m ON m.employee_id = e.manager_id
  LEFT JOIN users mu ON mu.user_id = m.user_id
`;

// GET /api/employees?search=&department=&status=
router.get('/', authorize('admin', 'manager'), async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const clauses = [];
    const params = [];

    // Managers only see their own team
    if (req.user.role === 'manager') {
      clauses.push('e.manager_id = ?');
      params.push(req.user.employeeId);
    }

    if (search) {
      clauses.push('(u.name LIKE ? OR u.email LIKE ? OR e.employee_code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (department) {
      clauses.push('d.department_id = ?');
      params.push(department);
    }
    if (status) {
      clauses.push('e.status = ?');
      params.push(status);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(`${BASE_SELECT} ${where} ORDER BY e.employee_id`, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`${BASE_SELECT} WHERE e.employee_id = ?`, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
});

// POST /api/employees  (admin only)
router.post('/', authorize('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const {
      name, email, password, departmentId, designation, phone,
      joiningDate, managerId, role
    } = req.body;

    if (!name || !email || !password || !departmentId || !designation || !joiningDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, role || 'employee']
    );

    const [[{ maxCode }]] = await conn.query(
      "SELECT MAX(CAST(SUBSTRING(employee_code, 4) AS UNSIGNED)) AS maxCode FROM employees WHERE employee_code LIKE 'EMP%'"
    );
    const nextCode = `EMP${String((maxCode || 0) + 1).padStart(3, '0')}`;

    const [empResult] = await conn.query(
      `INSERT INTO employees (employee_code, user_id, department_id, manager_id, designation, phone, joining_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [nextCode, userResult.insertId, departmentId, managerId || null, designation, phone || null, joiningDate]
    );

    await conn.commit();
    res.status(201).json({ employeeId: empResult.insertId, employeeCode: nextCode });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create employee' });
  } finally {
    conn.release();
  }
});

// PUT /api/employees/:id  (admin only)
router.put('/:id', authorize('admin'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;
    const { name, email, departmentId, designation, phone, joiningDate, managerId, status, role } = req.body;

    await conn.beginTransaction();

    const [empRows] = await conn.query('SELECT user_id FROM employees WHERE employee_id = ?', [id]);
    if (empRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Employee not found' });
    }
    const userId = empRows[0].user_id;

    await conn.query(
      'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role = COALESCE(?, role) WHERE user_id = ?',
      [name, email, role, userId]
    );

    await conn.query(
      `UPDATE employees SET
        department_id = COALESCE(?, department_id),
        designation = COALESCE(?, designation),
        phone = COALESCE(?, phone),
        joining_date = COALESCE(?, joining_date),
        manager_id = ?,
        status = COALESCE(?, status)
       WHERE employee_id = ?`,
      [departmentId, designation, phone, joiningDate, managerId || null, status, id]
    );

    await conn.commit();
    res.json({ message: 'Employee updated' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to update employee' });
  } finally {
    conn.release();
  }
});

// DELETE /api/employees/:id  (admin only) — soft delete (deactivate)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const { hard } = req.query;
    if (hard === 'true') {
      await pool.query('DELETE FROM employees WHERE employee_id = ?', [req.params.id]);
      return res.json({ message: 'Employee permanently deleted' });
    }
    await pool.query("UPDATE employees SET status = 'inactive' WHERE employee_id = ?", [req.params.id]);
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete employee' });
  }
});

module.exports = router;
