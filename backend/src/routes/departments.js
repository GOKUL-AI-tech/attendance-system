const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.department_id, d.name, d.description,
              COUNT(e.employee_id) AS employee_count
       FROM departments d
       LEFT JOIN employees e ON e.department_id = d.department_id AND e.status = 'active'
       GROUP BY d.department_id
       ORDER BY d.name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

module.exports = router;
