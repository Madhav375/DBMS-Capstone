import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { requireAdmin } from './auth.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);

const allowedOrigins = [
  'http://localhost:5173',
  'https://dbms-capstone-blue.vercel.app',
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : [])
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  sameSite: isProd ? 'none' : 'strict',
  secure: isProd,
  path: '/'
};

// Direct demo bypass: attaches an active admin user to every request
const demoAuth = (req, _res, next) => {
  req.user = {
    id: 1,
    name: 'Madhav',
    email: 'admin@nexora.local',
    role: 'admin'
  };
  next();
};

function issueToken(res, user) {
  const token = jwt.sign(
    { id: user.user_id, name: user.full_name, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'nexora_demo_secret',
    { expiresIn: '8h' }
  );
  res.cookie('nexora_token', token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Enter email and password.' });
  try {
    const [[user]] = await pool.execute(
      'SELECT user_id,full_name,email,password_hash,role,is_active FROM users WHERE email=?',
      [String(email).trim().toLowerCase()]
    );
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials or inactive employee account.' });
    }
    issueToken(res, user);
    res.json({ user: { id: user.user_id, name: user.full_name, email: user.email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Login failed. Check database setup.' });
  }
});

app.get('/api/auth/me', demoAuth, (req, res) => res.json({ user: req.user }));

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('nexora_token', cookieOptions);
  res.json({ ok: true });
});

app.post('/api/admin/employees', demoAuth, requireAdmin, async (req, res) => {
  const { full_name, email, password, role = 'employee' } = req.body || {};
  if (!full_name || !email || !password || password.length < 10) {
    return res.status(400).json({ error: 'Enter name, email and a password of at least 10 characters.' });
  }
  if (!['admin', 'employee'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const [r] = await pool.execute(
      'INSERT INTO users(full_name,email,password_hash,role,is_active) VALUES(?,?,?,?,1)',
      [full_name.trim(), email.trim().toLowerCase(), hash, role]
    );
    res.status(201).json({ user_id: r.insertId, full_name, email: email.trim().toLowerCase(), role, is_active: 1 });
  } catch (e) {
    res.status(400).json({
      error: e.code === 'ER_DUP_ENTRY' ? 'That email is already registered.' : 'Could not create employee.'
    });
  }
});

app.get('/api/admin/employees', demoAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query('SELECT user_id,full_name,email,role,is_active,created_at FROM users ORDER BY user_id');
  res.json(rows);
});

app.patch('/api/admin/employees/:id/status', demoAuth, requireAdmin, async (req, res) => {
  const active = Number(req.body?.is_active);
  if (![0, 1].includes(active)) return res.status(400).json({ error: 'Invalid status.' });
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account.' });
  }
  await pool.execute('UPDATE users SET is_active=? WHERE user_id=?', [active, req.params.id]);
  res.json({ ok: true });
});

app.use('/api', demoAuth);

app.get('/api/data', async (_req, res) => {
  try {
    const [[branches], [customers], [accounts], [loans], [transactions], [auditLogs]] = await Promise.all([
      pool.query('SELECT * FROM branches ORDER BY branch_id'),
      pool.query('SELECT * FROM customers ORDER BY customer_id'),
      pool.query('SELECT * FROM accounts ORDER BY account_number'),
      pool.query('SELECT * FROM loans ORDER BY loan_id'),
      pool.query("SELECT transaction_id,from_account,to_account,amount,transaction_type,status,DATE_FORMAT(transaction_date,'%d-%m-%Y %H:%i') AS date FROM transactions ORDER BY transaction_id DESC"),
      pool.query("SELECT log_id,account_number,action,old_balance,new_balance,DATE_FORMAT(created_at,'%d-%m-%Y %H:%i') AS date FROM audit_logs ORDER BY log_id DESC")
    ]);
    res.json({ branches, customers, accounts, loans, transactions, auditLogs });
  } catch (e) {
    res.status(500).json({ error: 'Could not load bank data.' });
  }
});

app.post('/api/customers', async (req, res) => {
  const { first_name, last_name, pan_number, phone, email, address = '' } = req.body;
  if (!first_name || !last_name || !pan_number || !phone || !email) {
    return res.status(400).json({ error: 'Fill all required customer fields.' });
  }
  try {
    const [r] = await pool.execute(
      'INSERT INTO customers(first_name,last_name,pan_number,phone,email,address) VALUES(?,?,?,?,?,?)',
      [first_name, last_name, pan_number, phone, email, address]
    );
    const [[row]] = await pool.query('SELECT * FROM customers WHERE customer_id=?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({
      error: e.code === 'ER_DUP_ENTRY' ? 'PAN, phone or email already exists.' : 'Could not save customer.'
    });
  }
});

app.post('/api/branches', requireAdmin, async (req, res) => {
  const { ifsc_code, branch_name, city, state } = req.body;
  if (!ifsc_code || !branch_name || !city || !state) {
    return res.status(400).json({ error: 'Fill all branch fields.' });
  }
  try {
    const [r] = await pool.execute(
      'INSERT INTO branches(ifsc_code,branch_name,city,state) VALUES(?,?,?,?)',
      [ifsc_code, branch_name, city, state]
    );
    const [[row]] = await pool.query('SELECT * FROM branches WHERE branch_id=?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: e.code === 'ER_DUP_ENTRY' ? 'IFSC code already exists.' : 'Could not save branch.' });
  }
});

app.post('/api/accounts', async (req, res) => {
  const { customer_id, branch_id, account_type, balance = 0 } = req.body;
  if (!customer_id || !branch_id || !account_type || Number(balance) < 0) {
    return res.status(400).json({ error: 'Enter valid account details.' });
  }
  try {
    const [r] = await pool.execute(
      "INSERT INTO accounts(customer_id,branch_id,account_type,balance,status) VALUES(?,?,?,?, 'Active')",
      [customer_id, branch_id, account_type, Number(balance)]
    );
    const [[row]] = await pool.query('SELECT * FROM accounts WHERE account_number=?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: 'Could not create account. Check customer and branch IDs.' });
  }
});

app.post('/api/loans', async (req, res) => {
  const { customer_id, branch_id, loan_type, principal_amount, interest_rate, tenure_months = 36 } = req.body;
  if (!customer_id || !branch_id || !loan_type || Number(principal_amount) <= 0 || Number(interest_rate) < 0) {
    return res.status(400).json({ error: 'Enter valid loan details.' });
  }
  try {
    const [r] = await pool.execute(
      "INSERT INTO loans(customer_id,branch_id,loan_type,principal_amount,interest_rate,tenure_months,status) VALUES(?,?,?,?,?,?,'Under Review')",
      [customer_id, branch_id, loan_type, principal_amount, interest_rate, tenure_months]
    );
    const [[row]] = await pool.query('SELECT * FROM loans WHERE loan_id=?', [r.insertId]);
    res.status(201).json(row);
  } catch (e) {
    res.status(400).json({ error: 'Could not save loan.' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { type, from_account, to_account, amount } = req.body;
  const value = Number(amount);
  if (!['Deposit', 'Withdrawal', 'Transfer'].includes(type) || !Number.isFinite(value) || value <= 0) {
    return res.status(400).json({ error: 'Choose a valid operation and amount.' });
  }
  if (type !== 'Deposit' && !from_account) {
    return res.status(400).json({ error: 'Select a source account.' });
  }
  if (type === 'Transfer' && (!to_account || String(from_account) === String(to_account))) {
    return res.status(400).json({ error: 'Select a different destination account.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ids = [
      ...new Set([
        type === 'Deposit' ? Number(to_account || from_account) : Number(from_account),
        ...(type === 'Transfer' ? [Number(to_account)] : [])
      ])
    ].filter(Boolean).sort((a, b) => a - b);

    const [rows] = await conn.query(
      `SELECT * FROM accounts WHERE account_number IN (${ids.map(() => '?').join(',')}) ORDER BY account_number FOR UPDATE`,
      ids
    );
    const byId = new Map(rows.map(x => [String(x.account_number), x]));
    const source = byId.get(String(from_account));
    const targetId = type === 'Deposit' ? (to_account || from_account) : to_account;
    const target = byId.get(String(targetId));

    if (type !== 'Deposit' && (!source || source.status !== 'Active' || Number(source.balance) < value)) {
      throw new Error('Source account is inactive, missing or has insufficient balance.');
    }
    if (type !== 'Withdrawal' && (!target || target.status !== 'Active')) {
      throw new Error('Destination account is inactive or does not exist.');
    }

    if (type !== 'Deposit') {
      const old = Number(source.balance);
      const next = old - value;
      await conn.execute('UPDATE accounts SET balance=? WHERE account_number=?', [next, source.account_number]);
      await conn.execute(
        'INSERT INTO audit_logs(account_number,action,old_balance,new_balance) VALUES(?,?,?,?)',
        [source.account_number, type === 'Transfer' ? 'TRANSFER_DEBIT' : 'WITHDRAWAL', old, next]
      );
    }

    if (type !== 'Withdrawal') {
      const old = Number(target.balance);
      const next = old + value;
      await conn.execute('UPDATE accounts SET balance=? WHERE account_number=?', [next, target.account_number]);
      await conn.execute(
        'INSERT INTO audit_logs(account_number,action,old_balance,new_balance) VALUES(?,?,?,?)',
        [target.account_number, type === 'Transfer' ? 'TRANSFER_CREDIT' : 'DEPOSIT', old, next]
      );
    }

    const [result] = await conn.execute(
      'INSERT INTO transactions(from_account,to_account,amount,transaction_type,status) VALUES(?,?,?,?,?)',
      [type === 'Deposit' ? null : Number(from_account), type === 'Withdrawal' ? null : Number(targetId), value, type, 'Success']
    );
    await conn.commit();

    const [[transaction]] = await pool.query(
      "SELECT transaction_id,from_account,to_account,amount,transaction_type,status,DATE_FORMAT(transaction_date,'%d-%m-%Y %H:%i') AS date FROM transactions WHERE transaction_id=?",
      [result.insertId]
    );
    const [accounts] = await pool.query('SELECT * FROM accounts ORDER BY account_number');
    const [auditLogs] = await pool.query(
      "SELECT log_id,account_number,action,old_balance,new_balance,DATE_FORMAT(created_at,'%d-%m-%Y %H:%i') AS date FROM audit_logs ORDER BY log_id DESC"
    );
    res.status(201).json({ transaction, accounts, auditLogs });
  } catch (e) {
    await conn.rollback();
    res.status(400).json({ error: e.message });
  } finally {
    conn.release();
  }
});

app.listen(port, () => console.log(`Nexora Bank API running at http://localhost:${port}`));