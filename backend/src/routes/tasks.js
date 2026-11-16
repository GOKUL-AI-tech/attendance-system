const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const BASE_SELECT = `
  SELECT t.*, au.name AS assignee_name, ae.employee_code AS assignee_code,
         bu.name AS assigner_name
  FROM tasks t
  JOIN employees ae ON ae.employee_id = t.assigned_to
  JOIN users au ON au.user_id = ae.user_id
  JOIN employees be ON be.employee_id = t.assigned_by
  JOIN users bu ON bu.user_id = be.user_id
`;

// GET /api/tasks  (role-aware: admin sees all, manager sees team, employee sees own)
router.get('/', async (req, res) => {
  try {
    const { status, priority, employeeId } = req.query;
    const clauses = [];
    const params = [];

    if (req.user.role === 'employee') {
      clauses.push('t.assigned_to = ?');
      params.push(req.user.employeeId);
    } else if (req.user.role === 'manager') {
      clauses.push('ae.manager_id = ?');
      params.push(req.user.employeeId);
    }
    if (employeeId) {
      clauses.push('t.assigned_to = ?');
      params.push(employeeId);
    }
    if (status) {
      clauses.push('t.status = ?');
      params.push(status);
    }
    if (priority) {
      clauses.push('t.priority = ?');
      params.push(priority);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await pool.query(`${BASE_SELECT} ${where} ORDER BY t.due_date ASC`, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks  (manager/admin only)
router.post('/', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate } = req.body;
    if (!title || !assignedTo || !dueDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const [result] = await pool.query(
      `INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
      [title, description || null, assignedTo, req.user.employeeId, priority || 'Medium', dueDate]
    );
    res.status(201).json({ taskId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id/status  (employee updates own task status)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [rows] = await pool.query('SELECT * FROM tasks WHERE task_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    const task = rows[0];
    if (req.user.role === 'employee' && task.assigned_to !== req.user.employeeId) {
      return res.status(403).json({ message: 'Not your task' });
    }

    const completedDate = status === 'Completed' ? new Date().toISOString().slice(0, 10) : null;
    await pool.query(
      'UPDATE tasks SET status = ?, completed_date = ? WHERE task_id = ?',
      [status, completedDate, req.params.id]
    );
    res.json({ message: 'Task status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task status' });
  }
});

// PUT /api/tasks/:id  (manager/admin full edit)
router.put('/:id', authorize('manager', 'admin'), async (req, res) => {
  try {
    const { title, description, assignedTo, priority, dueDate, status } = req.body;
    await pool.query(
      `UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description),
        assigned_to = COALESCE(?, assigned_to), priority = COALESCE(?, priority),
        due_date = COALESCE(?, due_date), status = COALESCE(?, status)
       WHERE task_id = ?`,
      [title, description, assignedTo, priority, dueDate, status, req.params.id]
    );
    res.json({ message: 'Task updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id  (manager/admin)
router.delete('/:id', authorize('manager', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE task_id = ?', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

module.exports = router;
