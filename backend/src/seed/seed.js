/**
 * Seed script — populates the attendance_system database with a
 * realistic, internally-consistent demo dataset:
 *   - 4 departments (IT, HR, Finance, Marketing)
 *   - 20 employees (incl. 4 managers + 1 admin user)
 *   - 30 days of attendance history
 *   - 50 tasks
 *   - 50 daily work reports
 *   - 20 leave requests
 *
 * Run with: npm run seed   (from backend/)
 */

const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const DEMO_PASSWORD = 'Password123!';

const DEPARTMENTS = [
  { name: 'IT', description: 'Information Technology' },
  { name: 'HR', description: 'Human Resources' },
  { name: 'Finance', description: 'Finance & Accounts' },
  { name: 'Marketing', description: 'Marketing & Growth' }
];

// 5 employees per department: index 0 of each dept becomes that dept's manager
const EMPLOYEE_NAMES = {
  IT: ['Arjun Mehta', 'Priya Nair', 'Rohit Sharma', 'Sneha Iyer', 'Karthik Raman'],
  HR: ['Divya Krishnan', 'Aakash Verma', 'Meera Pillai', 'Sanjay Gupta', 'Lakshmi Menon'],
  Finance: ['Vikram Rao', 'Ananya Das', 'Suresh Kumar', 'Pooja Reddy', 'Manoj Tiwari'],
  Marketing: ['Neha Kapoor', 'Rahul Chawla', 'Isha Bhatt', 'Deepak Joshi', 'Ritu Malhotra']
};

const DESIGNATIONS = {
  manager: 'Team Manager',
  IT: ['Software Engineer', 'Senior Developer', 'QA Engineer', 'DevOps Engineer'],
  HR: ['HR Executive', 'Talent Acquisition Specialist', 'HR Generalist'],
  Finance: ['Accountant', 'Financial Analyst', 'Accounts Executive'],
  Marketing: ['Marketing Executive', 'Content Strategist', 'SEO Specialist']
};

const TASK_TITLES = [
  'Prepare monthly report', 'Fix login page bug', 'Design new landing page',
  'Conduct employee interview', 'Update payroll records', 'Review Q3 budget',
  'Create social media campaign', 'Optimize database queries', 'Write API documentation',
  'Onboard new hire', 'Audit expense claims', 'Design email newsletter',
  'Test mobile app release', 'Plan team offsite', 'Analyze competitor pricing',
  'Refactor authentication module', 'Prepare tax filing documents', 'Draft press release',
  'Set up CI/CD pipeline', 'Conduct performance review', 'Update employee handbook',
  'Reconcile bank statements', 'Launch SEO audit', 'Build dashboard UI component',
  'Coordinate vendor contract renewal'
];

const WORK_SUMMARIES = [
  'Worked on bug fixes for the login and authentication module',
  'Completed API integration for the payment gateway',
  'Reviewed and updated employee onboarding documentation',
  'Prepared financial summary report for the quarter',
  'Designed new marketing creatives for the social media campaign',
  'Conducted candidate interviews for the open developer role',
  'Optimized database queries to improve dashboard load time',
  'Wrote unit tests for the attendance module',
  'Coordinated with vendor for contract renewal discussion',
  'Analyzed website traffic and prepared SEO recommendations',
  'Reconciled monthly expense reports and flagged discrepancies',
  'Built new UI components for the employee dashboard',
  'Updated payroll records for the current month',
  'Drafted content for the upcoming product newsletter',
  'Fixed responsive layout issues on the mobile app',
  'Set up automated deployment pipeline for the backend service',
  'Reviewed budget allocations for the marketing team',
  'Prepared training material for new hire onboarding',
  'Investigated and resolved server performance issue',
  'Compiled competitor analysis report for leadership review'
];

const LEAVE_TYPES = ['Sick', 'Casual', 'Paid', 'Unpaid', 'Other'];
const LEAVE_REASONS = [
  'Feeling unwell, need rest', 'Family function', 'Personal work', 'Medical appointment',
  'Travel plans', 'Home repair work', 'Attending a wedding', 'Child care', 'Relocation', 'Festival celebration'
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}
function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}
function pad2(n) {
  return String(n).padStart(2, '0');
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('Clearing existing data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['leave_requests', 'work_reports', 'tasks', 'attendance', 'employees', 'users', 'departments']) {
      await conn.query(`TRUNCATE TABLE ${t}`);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Hashing demo password...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    console.log('Inserting departments...');
    const deptIds = {};
    for (const dept of DEPARTMENTS) {
      const [result] = await conn.query(
        'INSERT INTO departments (name, description) VALUES (?, ?)',
        [dept.name, dept.description]
      );
      deptIds[dept.name] = result.insertId;
    }

    console.log('Inserting admin user...');
    await conn.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['System Admin', 'admin@company.com', passwordHash, 'admin']
    );

    console.log('Inserting employees (with manager per department)...');
    const employees = []; // { employeeId, name, deptName, isManager, managerId }
    let empCounter = 1;
    let usedManagerDemo = false;
    let usedEmployeeDemo = false;

    for (const deptName of Object.keys(EMPLOYEE_NAMES)) {
      const names = EMPLOYEE_NAMES[deptName];
      let managerEmployeeId = null;

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const isManager = i === 0;
        const role = isManager ? 'manager' : 'employee';

        let email;
        if (isManager && deptName === 'IT' && !usedManagerDemo) {
          email = 'manager@company.com';
          usedManagerDemo = true;
        } else if (!isManager && deptName === 'IT' && !usedEmployeeDemo) {
          email = 'employee@company.com';
          usedEmployeeDemo = true;
        } else {
          const slug = name.toLowerCase().replace(/\s+/g, '.');
          email = `${slug}@company.com`;
        }

        const [userResult] = await conn.query(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
          [name, email, passwordHash, role]
        );

        const employeeCode = `EMP${pad2(empCounter)}`;
        const designation = isManager ? DESIGNATIONS.manager : pick(DESIGNATIONS[deptName]);
        const joiningDate = toDateStr(new Date(2022 + randInt(0, 3), randInt(0, 11), randInt(1, 28)));
        const phone = `9${randInt(100000000, 999999999)}`;

        const [empResult] = await conn.query(
          `INSERT INTO employees (employee_code, user_id, department_id, manager_id, designation, phone, joining_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [employeeCode, userResult.insertId, deptIds[deptName], null, designation, phone, joiningDate]
        );

        const employeeId = empResult.insertId;
        if (isManager) managerEmployeeId = employeeId;

        employees.push({ employeeId, name, deptName, isManager, managerId: null });
        empCounter++;
      }

      // second pass: set manager_id for non-managers in this department
      const deptEmployees = employees.filter(e => e.deptName === deptName);
      for (const emp of deptEmployees) {
        if (!emp.isManager) {
          emp.managerId = managerEmployeeId;
          await conn.query('UPDATE employees SET manager_id = ? WHERE employee_id = ?', [managerEmployeeId, emp.employeeId]);
        }
      }
    }

    console.log(`Inserted ${employees.length} employees.`);

    // ---------------- Leave requests (20) ----------------
    console.log('Inserting leave requests...');
    const today = new Date();
    const leaveRequests = [];
    const approvedLeaveDatesByEmployee = {}; // employeeId -> Set of date strings

    for (let i = 0; i < 20; i++) {
      const emp = pick(employees);
      const startOffset = randInt(-25, 10); // some in the past, some upcoming
      const from = new Date(today);
      from.setDate(from.getDate() + startOffset);
      const duration = randInt(0, 2); // 1-3 day leaves
      const to = new Date(from);
      to.setDate(to.getDate() + duration);

      const leaveType = pick(LEAVE_TYPES);
      const reason = pick(LEAVE_REASONS);

      // Decide status: past leaves are mostly decided, future/recent ones may be pending
      let status;
      if (startOffset < -3) {
        status = Math.random() < 0.85 ? 'Approved' : 'Rejected';
      } else {
        status = pick(['Pending', 'Approved', 'Rejected']);
      }

      const manager = employees.find(e => e.employeeId === emp.managerId) || employees.find(e => e.isManager);
      const reviewedBy = status === 'Pending' ? null : (manager ? manager.employeeId : null);

      const [result] = await conn.query(
        `INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, reason, status, reviewed_by, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          emp.employeeId, leaveType, toDateStr(from), toDateStr(to), reason, status,
          reviewedBy, status === 'Pending' ? null : new Date()
        ]
      );

      leaveRequests.push({ id: result.insertId, employeeId: emp.employeeId, from, to, status });

      if (status === 'Approved') {
        if (!approvedLeaveDatesByEmployee[emp.employeeId]) approvedLeaveDatesByEmployee[emp.employeeId] = new Set();
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          if (isWeekend(d)) continue;
          approvedLeaveDatesByEmployee[emp.employeeId].add(toDateStr(d));
        }
      }
    }
    console.log(`Inserted ${leaveRequests.length} leave requests.`);

    // ---------------- Attendance (30 days) ----------------
    console.log('Inserting 30 days of attendance records...');
    let attendanceCount = 0;
    const presentDatesByEmployee = {}; // employeeId -> Set of date strings marked Present/Late (for work report consistency)

    for (const emp of employees) {
      presentDatesByEmployee[emp.employeeId] = new Set();
      for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
        const d = new Date(today);
        d.setDate(d.getDate() - dayOffset);
        if (isWeekend(d)) continue; // weekends are holidays
        if (d > today) continue;

        const dateStr = toDateStr(d);
        const onLeave = approvedLeaveDatesByEmployee[emp.employeeId] && approvedLeaveDatesByEmployee[emp.employeeId].has(dateStr);

        if (onLeave) {
          await conn.query(
            `INSERT INTO attendance (employee_id, work_date, status) VALUES (?, ?, 'Leave')`,
            [emp.employeeId, dateStr]
          );
          attendanceCount++;
          continue;
        }

        const roll = Math.random();
        if (roll < 0.06) {
          // Absent
          await conn.query(
            `INSERT INTO attendance (employee_id, work_date, status) VALUES (?, ?, 'Absent')`,
            [emp.employeeId, dateStr]
          );
        } else {
          const isLate = roll < 0.20; // ~14% late
          const checkInHour = isLate ? randInt(9, 10) : 9;
          const checkInMin = isLate ? randInt(31, 59) : randInt(0, 29);
          const checkIn = `${pad2(checkInHour)}:${pad2(checkInMin)}:00`;

          const workHours = 8 + (Math.random() * 1.5 - 0.5); // 7.5 - 9.5 hrs
          const checkInDate = new Date(`${dateStr}T${checkIn}`);
          const checkOutDate = new Date(checkInDate.getTime() + workHours * 3600 * 1000);
          const checkOut = `${pad2(checkOutDate.getHours())}:${pad2(checkOutDate.getMinutes())}:00`;

          const status = isLate ? 'Late' : 'Present';

          await conn.query(
            `INSERT INTO attendance (employee_id, work_date, check_in, check_out, working_hours, status, is_late)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [emp.employeeId, dateStr, checkIn, checkOut, workHours.toFixed(2), status, isLate ? 1 : 0]
          );
          presentDatesByEmployee[emp.employeeId].add(dateStr);
        }
        attendanceCount++;
      }
    }
    console.log(`Inserted ${attendanceCount} attendance records.`);

    // ---------------- Tasks (50) ----------------
    console.log('Inserting tasks...');
    let taskCount = 0;
    for (let i = 0; i < 50; i++) {
      const emp = employees[randInt(0, employees.length - 1)];
      const assigner = employees.find(e => e.employeeId === emp.managerId) || employees.find(e => e.isManager && e.deptName === emp.deptName) || emp;

      const title = pick(TASK_TITLES);
      const description = `${title} — assigned as part of routine ${emp.deptName} department workflow.`;
      const priority = pick(['Low', 'Medium', 'High']);

      const dueOffset = randInt(-15, 15);
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + dueOffset);

      let status;
      let completedDate = null;
      if (dueOffset < -2) {
        status = pick(['Completed', 'Completed', 'In Progress']);
      } else if (dueOffset < 3) {
        status = pick(['In Progress', 'Pending', 'Completed']);
      } else {
        status = pick(['Pending', 'Pending', 'In Progress']);
      }

      if (status === 'Completed') {
        const compDate = new Date(dueDate);
        compDate.setDate(compDate.getDate() - randInt(0, 3));
        if (compDate > today) compDate.setTime(today.getTime());
        completedDate = toDateStr(compDate);
      }

      await conn.query(
        `INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date, status, completed_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, emp.employeeId, assigner.employeeId, priority, toDateStr(dueDate), status, completedDate]
      );
      taskCount++;
    }
    console.log(`Inserted ${taskCount} tasks.`);

    // ---------------- Work reports (50) ----------------
    console.log('Inserting work reports...');
    let reportCount = 0;
    let attempts = 0;
    const usedPairs = new Set();

    while (reportCount < 50 && attempts < 500) {
      attempts++;
      const emp = employees[randInt(0, employees.length - 1)];
      const presentDates = Array.from(presentDatesByEmployee[emp.employeeId] || []);
      if (presentDates.length === 0) continue;

      const dateStr = pick(presentDates);
      const key = `${emp.employeeId}_${dateStr}`;
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const workCompleted = pick(WORK_SUMMARIES);
      const hoursWorked = (6 + Math.random() * 3).toFixed(2);
      const taskStatus = pick(['In Progress', 'Completed', 'Pending']);
      const remarks = Math.random() < 0.3 ? 'No blockers.' : (Math.random() < 0.5 ? 'Minor delay due to dependency.' : null);

      await conn.query(
        `INSERT INTO work_reports (employee_id, report_date, work_completed, hours_worked, task_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [emp.employeeId, dateStr, workCompleted, hoursWorked, taskStatus, remarks]
      );
      reportCount++;
    }
    console.log(`Inserted ${reportCount} work reports.`);

    console.log('\nSeed complete!');
    console.log('----------------------------------------');
    console.log('Demo accounts (password for all: ' + DEMO_PASSWORD + ')');
    console.log('  Admin:    admin@company.com');
    console.log('  Manager:  manager@company.com');
    console.log('  Employee: employee@company.com');
    console.log('----------------------------------------');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed();
