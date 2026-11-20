# Nexora Bank – Full Stack Bank Management System

This project keeps the supplied React + Vite frontend and adds an Express/Node.js backend connected to MySQL.

## Requirements
- Node.js (LTS recommended)
- MySQL Server and MySQL Workbench
- VS Code (recommended)

## 1. Create the database in MySQL Workbench
1. Open MySQL Workbench and connect to your local MySQL Server.
2. Choose **File → Open SQL Script** and open `database/nexora_bank.sql` from this project.
3. Click the lightning bolt **Execute** button.
4. In the Schemas panel, refresh and confirm that `nexora_bank` exists.
5. The script creates the tables and inserts illustrative demo data. **Important:** the script drops and recreates these project tables when run again, so do not rerun it after entering data you want to keep.

Tables: `branches`, `customers`, `accounts`, `loans`, `loan_payments`, `transactions`, `audit_logs`.

## 2. Configure and start the backend
1. Open this project folder in VS Code.
2. Open a terminal and run:
   ```bash
   cd backend
   npm install
   ```
3. Copy `backend/.env.example` to a new file named `backend/.env`.
4. Open `.env` and set `DB_PASSWORD` to the password for your MySQL `root` account. If your MySQL user is different, change `DB_USER` too. Keep `DB_NAME=nexora_bank`.
5. Start the backend:
   ```bash
   npm start
   ```
6. Keep this terminal open. It should say `Nexora Bank API running at http://localhost:5000`.
7. Optional check: open `http://localhost:5000/api/health` in your browser. It should show `{"ok":true,"database":"connected"}`.

## 3. Start the React frontend
1. Open a **second** VS Code terminal (do not stop the backend terminal).
2. From the project root, run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the local URL Vite prints, normally `http://localhost:5173`.

## 4. Verify that data is saved in MySQL
- Add a customer from Customer Management, then run `SELECT * FROM customers;` in Workbench.
- Add a branch and check `SELECT * FROM branches;`.
- Add an account and check `SELECT * FROM accounts;`.
- Add a loan and check `SELECT * FROM loans;`.
- Perform a deposit, withdrawal, or transfer from Money Operations. Then check:
  ```sql
  SELECT * FROM transactions ORDER BY transaction_id DESC;
  SELECT * FROM accounts;
  SELECT * FROM audit_logs ORDER BY log_id DESC;
  ```
- Refresh the browser. Records are loaded from MySQL and should remain there.

## Notes
- MySQL Workbench is where you create/manage the database and run SQL queries. It does not run the React website or Node server.
- Keep both terminal windows running while using the application.
- If port 5000 is busy, change `PORT` in `backend/.env`; update the frontend API URL in `src/App.jsx` to match.
- This is a learning/demo application. It is not connected to real banking rails, payment networks, authentication, or production-grade security. Use only fictitious sample data. Never enter real banking credentials or customer information.


## Employee-only login (new)

This is an educational local demo, not a production banking system. Public sign-up is disabled. The first admin is created by a one-time setup script, and only an authenticated admin can create employee accounts.

### 1. Database
If this is a fresh install, run `database/nexora_bank.sql` in MySQL Workbench to create and seed the demo banking tables (it drops/recreates those demo tables, so run it only for initial setup). If you already have a working `nexora_bank` database, do **not** rerun that file; run only `database/employee_auth.sql` to add the employee login table without deleting existing records.

### 2. Backend environment
In `backend`, copy `.env.example` to `.env`. Fill in your MySQL connection values. Set `JWT_SECRET` to a long random secret (at least 32 characters). Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (unique password of at least 12 characters). Do not share or commit `.env`.

### 3. Create the first admin
In a terminal:
```bash
cd backend
npm install
npm run setup-admin
```
The script stores a bcrypt password hash in MySQL. It does not store the plain-text password.

### 4. Run the application
Terminal 1:
```bash
cd backend
npm start
```
Terminal 2, from the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:5173` and sign in using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your local `.env`.

### 5. Create employees
After signing in as admin, click **Employee accounts** in the top-right bar. Create employee accounts there. Employees cannot register themselves. Admin-only endpoints reject employee accounts, and all banking APIs require a valid signed HTTP-only session cookie.

### Permissions in this demo
- Admin: all available banking features and employee account management.
- Employee: view data and perform the available customer, account, loan and transaction operations. Branch creation and employee management are admin-only.
- Unauthenticated visitors: cannot load bank data or use banking APIs.

For a real deployment, use HTTPS, secure cookie settings, CSRF protection, stronger operational controls, backups, monitoring, and a professional security review. Never use real customer data or real funds in this educational project.
