-- Nexora Bank demo database. Run this complete file in MySQL Workbench.
CREATE DATABASE IF NOT EXISTS nexora_bank;
USE nexora_bank;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS loan_payments;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS branches;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE branches (
  branch_id INT AUTO_INCREMENT PRIMARY KEY,
  ifsc_code VARCHAR(15) NOT NULL UNIQUE,
  branch_name VARCHAR(100) NOT NULL,
  city VARCHAR(60) NOT NULL,
  state VARCHAR(60) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  pan_number CHAR(10) NOT NULL UNIQUE,
  first_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  address VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE accounts (
  account_number BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  branch_id INT NOT NULL,
  account_type ENUM('Savings','Current','Fixed Deposit') NOT NULL,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status ENUM('Active','Dormant','Closed') NOT NULL DEFAULT 'Active',
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_account_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  CONSTRAINT fk_account_branch FOREIGN KEY (branch_id) REFERENCES branches(branch_id),
  CONSTRAINT chk_account_balance CHECK (balance >= 0)
) AUTO_INCREMENT=1001000101;
CREATE TABLE loans (
  loan_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  branch_id INT NOT NULL,
  loan_type ENUM('Home','Auto','Education','Personal','Business') NOT NULL,
  principal_amount DECIMAL(15,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL,
  tenure_months INT NOT NULL DEFAULT 36,
  status ENUM('Under Review','Active','Rejected','Closed') NOT NULL DEFAULT 'Under Review',
  sanctioned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
);
CREATE TABLE loan_payments (
  payment_id INT AUTO_INCREMENT PRIMARY KEY,
  loan_id INT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(loan_id)
);
CREATE TABLE transactions (
  transaction_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  from_account BIGINT NULL,
  to_account BIGINT NULL,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type ENUM('Deposit','Withdrawal','Transfer') NOT NULL,
  status ENUM('Success','Failed') NOT NULL DEFAULT 'Success',
  transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_account) REFERENCES accounts(account_number),
  FOREIGN KEY (to_account) REFERENCES accounts(account_number)
);
CREATE TABLE audit_logs (
  log_id BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_number BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_balance DECIMAL(15,2) NOT NULL,
  new_balance DECIMAL(15,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_number) REFERENCES accounts(account_number)
);

INSERT INTO branches (branch_id,ifsc_code,branch_name,city,state) VALUES
(1,'SBIN0000300','Nariman Point Branch','Mumbai','Maharashtra'),
(2,'SBIN0000691','Connaught Place Branch','New Delhi','Delhi'),
(3,'HDFC0000053','Indiranagar Branch','Bengaluru','Karnataka'),
(4,'ICIC0000007','FC Road Branch','Pune','Maharashtra'),
(5,'PUNB0001200','Anna Salai Branch','Chennai','Tamil Nadu');
INSERT INTO customers (customer_id,pan_number,first_name,last_name,phone,email,address) VALUES
(1,'ABCDE1234F','Aarav','Sharma','+919820112233','aarav.sharma@example.com','Flat 402, Sea Green Apts, Worli, Mumbai'),
(2,'BCDEF2345G','Pooja','Verma','+919811223344','pooja.verma@example.com','B-12, Green Park Extension, New Delhi'),
(3,'CDEFG3456H','Rohan','Iyer','+919845334455','rohan.iyer@example.com','74, 4th Cross, Indiranagar, Bengaluru'),
(4,'DEFGH4567I','Sneha','Patil','+919890445566','sneha.patil@example.com','15, Prabhat Road, Lane 3, Pune'),
(5,'EFGHI5678J','Vikram','Mehta','+919821556677','vikram.mehta@example.com','21, Marine Drive, Churchgate, Mumbai'),
(6,'FGHIJ6789K','Ananya','Reddy','+919840667788','ananya.reddy@example.com','88, TTK Road, Alwarpet, Chennai');
INSERT INTO accounts (account_number,customer_id,branch_id,account_type,balance,status,opened_at) VALUES
(1001000101,1,1,'Savings',85000.00,'Active','2025-01-15 10:30:00'),
(1001000102,1,1,'Current',250000.00,'Active','2025-02-01 11:15:00'),
(1001000201,2,2,'Savings',42000.50,'Active','2025-02-10 14:00:00'),
(1001000301,3,3,'Savings',195000.00,'Active','2025-03-05 09:45:00'),
(1001000302,3,3,'Fixed Deposit',500000.00,'Active','2025-03-06 16:20:00'),
(1001000401,4,4,'Savings',63500.00,'Active','2025-03-18 12:10:00'),
(1001000501,5,1,'Current',1250000.00,'Active','2025-04-02 15:30:00'),
(1001000601,6,5,'Savings',12000.00,'Dormant','2024-11-20 10:00:00');
INSERT INTO loans (loan_id,customer_id,branch_id,loan_type,principal_amount,interest_rate,tenure_months,status,sanctioned_at) VALUES
(1,1,1,'Home',4500000.00,8.50,240,'Active','2025-02-15 12:00:00'),
(2,3,3,'Auto',850000.00,9.25,60,'Active','2025-03-12 15:45:00'),
(3,4,4,'Education',1200000.00,9.00,84,'Active','2025-04-01 10:30:00'),
(4,5,1,'Personal',300000.00,11.75,36,'Active','2025-04-18 17:15:00');
INSERT INTO transactions (transaction_id,from_account,to_account,amount,transaction_type,status,transaction_date) VALUES
(1,NULL,1001000101,50000.00,'Deposit','Success','2025-01-16 11:00:00'),
(2,1001000101,1001000201,15000.00,'Transfer','Success','2025-02-15 14:30:00'),
(3,1001000201,NULL,5000.00,'Withdrawal','Success','2025-02-20 16:45:00'),
(4,NULL,1001000301,200000.00,'Deposit','Success','2025-03-05 10:00:00'),
(5,1001000301,1001000302,500000.00,'Transfer','Success','2025-03-06 16:00:00'),
(6,1001000501,1001000401,35000.00,'Transfer','Success','2025-04-10 11:20:00'),
(7,1001000401,NULL,10000.00,'Withdrawal','Success','2025-04-12 18:05:00'),
(8,1001000102,1001000501,75000.00,'Transfer','Success','2025-04-15 13:40:00');
INSERT INTO audit_logs (log_id,account_number,action,old_balance,new_balance,created_at) VALUES
(1,1001000101,'INITIAL_DEPOSIT',0.00,50000.00,'2025-01-16 11:00:00'),
(2,1001000101,'TRANSFER_DEBIT',100000.00,85000.00,'2025-02-15 14:30:00'),
(3,1001000201,'TRANSFER_CREDIT',27000.50,42000.50,'2025-02-15 14:30:00'),
(4,1001000201,'ATM_WITHDRAWAL',47000.50,42000.50,'2025-02-20 16:45:00');

ALTER TABLE branches AUTO_INCREMENT=6;
ALTER TABLE customers AUTO_INCREMENT=7;
ALTER TABLE accounts AUTO_INCREMENT=1001000602;
ALTER TABLE loans AUTO_INCREMENT=5;
ALTER TABLE transactions AUTO_INCREMENT=9;
ALTER TABLE audit_logs AUTO_INCREMENT=5;



-- Employee-only login accounts. Passwords are bcrypt hashes created by setupAdmin.js.
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quick verification
SHOW TABLES;
SELECT COUNT(*) AS customers FROM customers;
SELECT COUNT(*) AS accounts FROM accounts;
