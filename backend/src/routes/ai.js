const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();
router.use(authenticate);

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:6000';

function localFallback({ employeeName, reports, attendanceRate, taskCompletionRate, tasksCompleted, tasksTotal }) {
  const avgHours = reports.length
    ? reports.reduce((sum, r) => sum + Number(r.hours_worked || 0), 0) / reports.length
    : 0;
  const score = Math.round(
    (attendanceRate * 0.35 + taskCompletionRate * 0.40 + Math.min(avgHours / 8, 1) * 0.25) * 100 * 10
  ) / 10;
  const band = score >= 80 ? 'Strong' : score >= 60 ? 'Steady' : score >= 40 ? 'Developing' : 'Needs attention';
  return {
    summary: reports.length
      ? `Over the last ${reports.length} logged day(s), ${employeeName} logged an average of ${avgHours.toFixed(1)} hrs/day, completing ${tasksCompleted} of ${tasksTotal} assigned task(s).`
      : `No work reports are available yet for ${employeeName} in this period.`,
    keywords: [],
    productivityIndicator: {
      score,
      band,
      note: 'Informational metric only -- not an automatic performance judgment.',
      components: {
        attendanceRate: Math.round(attendanceRate * 1000) / 10,
        taskCompletionRate: Math.round(taskCompletionRate * 1000) / 10,
        avgHoursPerDay: Math.round(avgHours * 100) / 100
      }
    },
    source: 'fallback'
  };
}

// GET /api/ai/work-summary/:employeeId?days=14
router.get('/work-summary/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const days = parseInt(req.query.days || '14', 10);

    // Authorization: employee can only view own; manager only own team; admin any
    if (req.user.role === 'employee' && String(req.user.employeeId) !== String(employeeId)) {
      return res.status(403).json({ message: 'Not authorized to view this summary' });
    }
    if (req.user.role === 'manager') {
      const [[emp]] = await pool.query('SELECT manager_id FROM employees WHERE employee_id = ?', [employeeId]);
      if (!emp || String(emp.manager_id) !== String(req.user.employeeId)) {
        return res.status(403).json({ message: 'Not authorized to view this summary' });
      }
    }

    const [[empInfo]] = await pool.query(
      `SELECT u.name FROM employees e JOIN users u ON u.user_id = e.user_id WHERE e.employee_id = ?`,
      [employeeId]
    );
    if (!empInfo) return res.status(404).json({ message: 'Employee not found' });

    const [reports] = await pool.query(
      `SELECT report_date AS date, work_completed, hours_worked, task_status
       FROM work_reports WHERE employee_id = ? AND report_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       ORDER BY report_date DESC`,
      [employeeId, days]
    );

    const [[attStats]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) AS present,
         COUNT(*) AS total
       FROM attendance WHERE employee_id = ? AND work_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
      [employeeId, days]
    );
    const attendanceRate = attStats.total > 0 ? attStats.present / attStats.total : 0;

    const [[taskStats]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
         COUNT(*) AS total
       FROM tasks WHERE assigned_to = ?`,
      [employeeId]
    );
    const taskCompletionRate = taskStats.total > 0 ? taskStats.completed / taskStats.total : 0;

    const requestBody = {
      employeeName: empInfo.name,
      reports,
      attendanceRate,
      taskCompletionRate,
      tasksCompleted: taskStats.completed || 0,
      tasksTotal: taskStats.total || 0
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`${AI_SERVICE_URL}/api/ai/work-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`AI service returned ${response.status}`);
      const data = await response.json();
      return res.json({ ...data, source: 'ai-service' });
    } catch (aiErr) {
      console.warn('AI service unavailable, using local fallback:', aiErr.message);
      return res.json(localFallback(requestBody));
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to generate work summary' });
  }
});

module.exports = router;
