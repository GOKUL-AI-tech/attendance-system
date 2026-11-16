const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/admin
router.get('/admin', authorize('admin'), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [[{ totalEmployees }]] = await pool.query(
      "SELECT COUNT(*) AS totalEmployees FROM employees WHERE status = 'active'"
    );
    const [[{ presentToday }]] = await pool.query(
      "SELECT COUNT(*) AS presentToday FROM attendance WHERE work_date = ? AND status IN ('Present','Late')",
      [today]
    );
    const [[{ onLeave }]] = await pool.query(
      "SELECT COUNT(*) AS onLeave FROM attendance WHERE work_date = ? AND status = 'Leave'",
      [today]
    );
    const [[{ totalDepartments }]] = await pool.query('SELECT COUNT(*) AS totalDepartments FROM departments');

    const activeEmployees = totalEmployees;
    const absentToday = Math.max(0, activeEmployees - presentToday - onLeave);

    const [attendanceOverview] = await pool.query(
      `SELECT work_date,
              SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
              SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late,
              SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
              SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave_count
       FROM attendance
       WHERE work_date >= DATE_SUB(?, INTERVAL 13 DAY)
       GROUP BY work_date ORDER BY work_date`,
      [today]
    );

    const [departmentWise] = await pool.query(
      `SELECT d.name AS department, COUNT(e.employee_id) AS employees
       FROM departments d LEFT JOIN employees e ON e.department_id = d.department_id AND e.status = 'active'
       GROUP BY d.department_id ORDER BY d.name`
    );

    res.json({
      totalEmployees,
      presentToday,
      absentToday,
      onLeave,
      totalDepartments,
      attendanceOverview,
      departmentWise
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load admin dashboard' });
  }
});

// GET /api/dashboard/manager
router.get('/manager', authorize('manager'), async (req, res) => {
  try {
    const managerId = req.user.employeeId;
    const today = new Date().toISOString().slice(0, 10);

    const [[{ teamMembers }]] = await pool.query(
      "SELECT COUNT(*) AS teamMembers FROM employees WHERE manager_id = ? AND status = 'active'",
      [managerId]
    );
    const [[{ presentToday }]] = await pool.query(
      `SELECT COUNT(*) AS presentToday FROM attendance a JOIN employees e ON e.employee_id = a.employee_id
       WHERE e.manager_id = ? AND a.work_date = ? AND a.status IN ('Present','Late')`,
      [managerId, today]
    );
    const [[{ absent }]] = await pool.query(
      `SELECT COUNT(*) AS absent FROM attendance a JOIN employees e ON e.employee_id = a.employee_id
       WHERE e.manager_id = ? AND a.work_date = ? AND a.status = 'Absent'`,
      [managerId, today]
    );
    const [[{ pendingTasks }]] = await pool.query(
      `SELECT COUNT(*) AS pendingTasks FROM tasks t JOIN employees e ON e.employee_id = t.assigned_to
       WHERE e.manager_id = ? AND t.status IN ('Pending','In Progress')`,
      [managerId]
    );
    const [[{ completedTasks }]] = await pool.query(
      `SELECT COUNT(*) AS completedTasks FROM tasks t JOIN employees e ON e.employee_id = t.assigned_to
       WHERE e.manager_id = ? AND t.status = 'Completed'`,
      [managerId]
    );

    res.json({ teamMembers, presentToday, absent, pendingTasks, completedTasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load manager dashboard' });
  }
});

// GET /api/dashboard/employee
router.get('/employee', authorize('employee', 'manager', 'admin'), async (req, res) => {
  try {
    const employeeId = req.user.employeeId;
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    const [todayRows] = await pool.query(
      'SELECT * FROM attendance WHERE employee_id = ? AND work_date = ?',
      [employeeId, today]
    );

    const [[{ presentDays, totalHours, workingDaysLogged }]] = await pool.query(
      `SELECT
         SUM(CASE WHEN status IN ('Present','Late') THEN 1 ELSE 0 END) AS presentDays,
         SUM(COALESCE(working_hours,0)) AS totalHours,
         COUNT(*) AS workingDaysLogged
       FROM attendance WHERE employee_id = ? AND work_date >= ?`,
      [employeeId, firstOfMonth]
    );

    const attendancePercentage = workingDaysLogged > 0
      ? ((presentDays / workingDaysLogged) * 100).toFixed(1)
      : '0.0';

    const [[{ pendingTasks }]] = await pool.query(
      "SELECT COUNT(*) AS pendingTasks FROM tasks WHERE assigned_to = ? AND status IN ('Pending','In Progress')",
      [employeeId]
    );
    const [[{ completedTasks }]] = await pool.query(
      "SELECT COUNT(*) AS completedTasks FROM tasks WHERE assigned_to = ? AND status = 'Completed'",
      [employeeId]
    );

    const [[{ approvedLeaves }]] = await pool.query(
      "SELECT COUNT(*) AS approvedLeaves FROM leave_requests WHERE employee_id = ? AND status = 'Approved' AND YEAR(from_date) = YEAR(CURDATE())",
      [employeeId]
    );
    const ANNUAL_LEAVE_QUOTA = 18;
    const leaveBalance = Math.max(0, ANNUAL_LEAVE_QUOTA - approvedLeaves);

    res.json({
      today: todayRows[0] || null,
      workingHoursThisMonth: Number(totalHours || 0).toFixed(2),
      attendancePercentage,
      pendingTasks,
      completedTasks,
      leaveBalance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load employee dashboard' });
  }
});

module.exports = router;
