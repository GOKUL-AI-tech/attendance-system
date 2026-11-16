-- ============================================================
-- Employee Attendance & Work Monitoring System - MySQL Schema
-- ============================================================

DROP DATABASE IF EXISTS attendance_system;
CREATE DATABASE attendance_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE attendance_system;

-- ------------------------------------------------------------
-- departments
-- ------------------------------------------------------------
CREATE TABLE departments (
  department_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- users  (login/auth identity, one row per person who can log in)
-- ------------------------------------------------------------
CREATE TABLE users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'manager', 'employee') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- employees  (extra profile info; linked 1:1 to a user account)
-- manager_id references another employee (self-referencing) who
-- manages this employee (nullable for admins/top-level managers)
-- ------------------------------------------------------------
CREATE TABLE employees (
  employee_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  department_id INT NOT NULL,
  manager_id INT NULL,
  designation VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  joining_date DATE NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
  CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- attendance
-- ------------------------------------------------------------
CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date DATE NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  working_hours DECIMAL(4,2) NULL,
  status ENUM('Present', 'Late', 'Absent', 'Leave') NOT NULL DEFAULT 'Absent',
  is_late TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, work_date)
);

-- ------------------------------------------------------------
-- tasks
-- ------------------------------------------------------------
CREATE TABLE tasks (
  task_id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to INT NOT NULL,
  assigned_by INT NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  due_date DATE NOT NULL,
  status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  completed_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assigned_to) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assigner FOREIGN KEY (assigned_by) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- work_reports  (daily work report submitted by employee)
-- ------------------------------------------------------------
CREATE TABLE work_reports (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  report_date DATE NOT NULL,
  work_completed TEXT NOT NULL,
  hours_worked DECIMAL(4,2) NOT NULL DEFAULT 0,
  task_status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'In Progress',
  remarks VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_reports_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT uq_report_employee_date UNIQUE (employee_id, report_date)
);

-- ------------------------------------------------------------
-- leave_requests
-- ------------------------------------------------------------
CREATE TABLE leave_requests (
  leave_id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  leave_type ENUM('Sick', 'Casual', 'Paid', 'Unpaid', 'Other') NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  reason VARCHAR(500),
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES employees(employee_id) ON DELETE SET NULL
);

-- Helpful indexes
CREATE INDEX idx_attendance_date ON attendance(work_date);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_reports_employee_date ON work_reports(employee_id, report_date);
CREATE INDEX idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX idx_employees_department ON employees(department_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
