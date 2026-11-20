import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Layout, Intro, Button, Field, Table, Status, Foot, money } from "./components";
import { Plus } from "lucide-react";

const API = "https://nexora-bank-api.onrender.com";

function Dashboard({ d }) {
  let go = useNavigate();
  let total = (d.accounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
  return (
    <>
      <div className="welcome">
        <div>
          <h2>Welcome back, Madhav ✦</h2>
          <p>Overview of your bank's live records.</p>
        </div>
        <Button onClick={() => go("/money-operations")}>
          <Plus size={16} /> New transaction
        </Button>
      </div>
      <div className="stat-grid">
        {[
          ["Total customer balance", money(total)],
          ["Registered customers", d.customers.length],
          ["Bank accounts", d.accounts.length],
          ["Loan records", d.loans.length],
        ].map((x) => (
          <div className="stat-card" key={x[0]}>
            <div className="stat-top">{x[0]}</div>
            <strong>{x[1]}</strong>
            <small>Live MySQL data</small>
          </div>
        ))}
      </div>
      <div className="quick-grid">
        {[
          ["Customers", "/customers"],
          ["Accounts", "/accounts"],
          ["Money operations", "/money-operations"],
        ].map((x) => (
          <button className="quick-card" key={x[1]} onClick={() => go(x[1])}>
            <strong>{x[0]}</strong>
            <small>Open {x[0].toLowerCase()} page</small>
          </button>
        ))}
      </div>
      <section className="panel">
        <h3>Recent transactions</h3>
        <Table
          cols={["Transaction ID", "From account", "To account", "Type", "Amount", "Status"]}
          rows={d.transactions.slice(0, 6).map((t) => (
            <tr key={t.transaction_id}>
              <td>TXN-{t.transaction_id}</td>
              <td>{t.from_account || "—"}</td>
              <td>{t.to_account || "—"}</td>
              <td>{t.transaction_type}</td>
              <td>{money(t.amount)}</td>
              <td>
                <Status value={t.status} />
              </td>
            </tr>
          ))}
        />
      </section>
    </>
  );
}

function Entity({ title, subtitle, kind, d, setD, notify }) {
  let [open, O] = useState(false),
    [search, S] = useState(""),
    [f, F] = useState({
      first_name: "",
      last_name: "",
      pan_number: "",
      phone: "",
      email: "",
      ifsc_code: "",
      branch_name: "",
      city: "",
      state: "",
      customer_id: "",
      branch_id: "1",
      account_type: "Savings",
      balance: "1000",
      loan_type: "Personal",
      principal_amount: "100000",
      interest_rate: "9.5",
    });

  let fields =
    kind === "customers"
      ? ["first_name", "last_name", "pan_number", "phone", "email"]
      : kind === "branches"
      ? ["ifsc_code", "branch_name", "city", "state"]
      : kind === "accounts"
      ? ["customer_id", "branch_id", "account_type", "balance"]
      : ["customer_id", "branch_id", "loan_type", "principal_amount", "interest_rate"];

  let list =
    kind === "customers"
      ? d.customers
      : kind === "branches"
      ? d.branches
      : kind === "accounts"
      ? d.accounts
      : d.loans;

  let filtered = list.filter((x) =>
    Object.values(x).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  async function save(e) {
    e.preventDefault();
    try {
      let response = await fetch(`${API}/api/${kind}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f }),
      });
      let result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save record.");
      setD((p) => [result, ...p]);
      O(false);
      notify("Record saved in MySQL successfully.");
    } catch (error) {
      notify(error.message);
    }
  }

  let cols =
    kind === "customers"
      ? ["customer_id", "first_name", "last_name", "pan_number", "phone", "email"]
      : kind === "branches"
      ? ["branch_id", "ifsc_code", "branch_name", "city", "state"]
      : kind === "accounts"
      ? ["account_number", "customer_id", "branch_id", "account_type", "balance", "status"]
      : ["loan_id", "customer_id", "branch_id", "loan_type", "principal_amount", "interest_rate", "status"];

  return (
    <>
      <Intro
        title={title}
        subtitle={subtitle}
        action={
          <Button onClick={() => O(!open)}>
            <Plus size={16} /> Add{" "}
            {kind === "accounts"
              ? "account"
              : kind === "customers"
              ? "customer"
              : kind === "branches"
              ? "branch"
              : "loan"}
          </Button>
        }
      />
      {open && (
        <section className="panel">
          <form className="form-grid" onSubmit={save}>
            {fields.map((k) => (
              <Field
                key={k}
                label={k.replaceAll("_", " ")}
                value={f[k]}
                onChange={(v) => F({ ...f, [k]: v })}
                required
                type={["balance", "principal_amount", "interest_rate"].includes(k) ? "number" : "text"}
              />
            ))}
            <div className="form-actions">
              <Button type="submit">Save record</Button>
            </div>
          </form>
        </section>
      )}
      <section className="panel">
        <input
          className="wide-search"
          placeholder={"Search " + kind + "..."}
          value={search}
          onChange={(e) => S(e.target.value)}
        />
        <Table
          cols={cols.map((x) => x.replaceAll("_", " "))}
          rows={filtered.map((r, i) => (
            <tr key={r[cols[0]] || i}>
              {cols.map((c) => (
                <td key={c}>
                  {c === "balance" || c === "principal_amount" ? (
                    money(r[c])
                  ) : c === "status" ? (
                    <Status value={r[c]} />
                  ) : (
                    r[c] ?? "—"
                  )}
                </td>
              ))}
            </tr>
          ))}
        />
        <Foot n={filtered.length} label={kind} />
      </section>
    </>
  );
}

function Transactions({ d }) {
  return (
    <>
      <Intro
        title="Transaction history"
        subtitle="TRANSACTION table: from/to account, amount, type and status."
      />
      <section className="panel">
        <Table
          cols={["Transaction ID", "From account", "To account", "Amount", "Type", "Status", "Date"]}
          rows={d.transactions.map((t) => (
            <tr key={t.transaction_id}>
              <td>{t.transaction_id}</td>
              <td>{t.from_account || "—"}</td>
              <td>{t.to_account || "—"}</td>
              <td>{money(t.amount)}</td>
              <td>{t.transaction_type}</td>
              <td>{t.status}</td>
              <td>{t.date}</td>
            </tr>
          ))}
        />
      </section>
    </>
  );
}

function Audit({ d }) {
  return (
    <>
      <Intro title="Audit log" subtitle="AUDIT_LOG table: account actions and balance changes." />
      <section className="panel">
        <Table
          cols={["Log ID", "Account", "Action", "Old balance", "New balance", "Date"]}
          rows={d.auditLogs.map((l) => (
            <tr key={l.log_id}>
              <td>{l.log_id}</td>
              <td>{l.account_number}</td>
              <td>{l.action}</td>
              <td>{money(l.old_balance)}</td>
              <td>{money(l.new_balance)}</td>
              <td>{l.date}</td>
            </tr>
          ))}
        />
      </section>
    </>
  );
}

function Reports({ d }) {
  return (
    <>
      <Intro title="Reports & analytics" subtitle="Counts based on live database records." />
      <div className="stat-grid">
        {[
          ["Customers", d.customers.length],
          ["Branches", d.branches.length],
          ["Accounts", d.accounts.length],
          ["Loans", d.loans.length],
          ["Transactions", d.transactions.length],
        ].map((x) => (
          <div className="stat-card" key={x[0]}>
            <div className="stat-top">{x[0]}</div>
            <strong>{x[1]}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h3>Account balances by customer</h3>
        <Table
          cols={["Account number", "Customer ID", "Account type", "Balance"]}
          rows={d.accounts.map((a) => (
            <tr key={a.account_number}>
              <td>{a.account_number}</td>
              <td>{a.customer_id}</td>
              <td>{a.account_type}</td>
              <td>{money(a.balance)}</td>
            </tr>
          ))}
        />
      </section>
    </>
  );
}

function MoneyOps({ d, setAccounts, setTransactions, setAuditLogs, notify }) {
  let [type, T] = useState("Deposit"),
    [from, F] = useState(""),
    [to, TO] = useState(""),
    [amount, A] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      let response = await fetch(`${API}/api/transactions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          from_account: from,
          to_account: type === "Deposit" ? from : to,
          amount,
        }),
      });
      let result = await response.json();
      if (!response.ok) throw new Error(result.error || "Transaction failed.");
      setAccounts(result.accounts || []);
      setTransactions((p) => [result.transaction, ...p]);
      setAuditLogs(result.auditLogs || []);
      A("");
      notify("Transaction saved in MySQL successfully.");
    } catch (error) {
      notify(error.message);
    }
  }

  return (
    <>
      <Intro
        title="Money operations"
        subtitle="Deposits, withdrawals and transfers are processed and saved in MySQL."
      />
      <section className="panel">
        <div className="tabs">
          {["Deposit", "Withdrawal", "Transfer"].map((t) => (
            <button className={type === t ? "selected" : ""} key={t} onClick={() => T(t)}>
              {t}
            </button>
          ))}
        </div>
        <form className="form-grid" onSubmit={submit}>
          <Field
            label={type === "Deposit" ? "Deposit account" : "From account"}
            value={from}
            onChange={F}
            required
          >
            <select required value={from} onChange={(e) => F(e.target.value)}>
              <option value="">Select account</option>
              {d.accounts
                .filter((a) => a.status === "Active")
                .map((a) => (
                  <option key={a.account_number} value={a.account_number}>
                    {a.account_number} · {money(a.balance)}
                  </option>
                ))}
            </select>
          </Field>
          {type === "Transfer" && (
            <Field label="To account" value={to} onChange={TO} required>
              <select required value={to} onChange={(e) => TO(e.target.value)}>
                <option value="">Select destination</option>
                {d.accounts
                  .filter((a) => a.status === "Active" && String(a.account_number) !== from)
                  .map((a) => (
                    <option key={a.account_number} value={a.account_number}>
                      {a.account_number}
                    </option>
                  ))}
              </select>
            </Field>
          )}
          <Field label="Amount (₹)" type="number" value={amount} onChange={A} required />
          <div className="form-actions">
            <Button type="submit">Confirm {type.toLowerCase()}</Button>
          </div>
        </form>
        <p className="demo-warning">Educational demo only. Do not use real customer or banking data.</p>
      </section>
    </>
  );
}

function BankApp() {
  let [branches, setBranches] = useState([]),
    [customers, setCustomers] = useState([]),
    [accounts, setAccounts] = useState([]),
    [loans, setLoans] = useState([]),
    [transactions, setTransactions] = useState([]),
    [auditLogs, setAuditLogs] = useState([]),
    [toast, setToast] = useState(""),
    [loading, setLoading] = useState(true);

  let notify = (m) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    fetch(`${API}/api/data`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Backend could not load database data.");
        return r.json();
      })
      .then((data) => {
        setBranches(data.branches || []);
        setCustomers(data.customers || []);
        setAccounts(data.accounts || []);
        setLoans(data.loans || []);
        setTransactions(data.transactions || []);
        setAuditLogs(data.auditLogs || []);
        setLoading(false);
      })
      .catch((error) => {
        setLoading(false);
        notify("Cannot connect to MySQL backend. Waking up server...");
        console.error(error);
      });
  }, []);

  let d = { branches, customers, accounts, loans, transactions, auditLogs };

  return (
    <>
      {loading && <div className="toast">Connecting to Nexora Bank database...</div>}
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard d={d} />} />
          <Route
            path="customers"
            element={
              <Entity
                title="Customer management"
                subtitle="CUSTOMER table with unique PAN, phone and email."
                kind="customers"
                d={d}
                setD={setCustomers}
                notify={notify}
              />
            }
          />
          <Route
            path="branches"
            element={
              <Entity
                title="Branch management"
                subtitle="BRANCH table and IFSC code."
                kind="branches"
                d={d}
                setD={setBranches}
                notify={notify}
              />
            }
          />
          <Route
            path="accounts"
            element={
              <Entity
                title="Bank accounts"
                subtitle="ACCOUNT table and customer/branch relationships."
                kind="accounts"
                d={d}
                setD={setAccounts}
                notify={notify}
              />
            }
          />
          <Route
            path="loans"
            element={
              <Entity
                title="Loan management"
                subtitle="LOAN table with principal and interest rate."
                kind="loans"
                d={d}
                setD={setLoans}
                notify={notify}
              />
            }
          />
          <Route path="transactions" element={<Transactions d={d} />} />
          <Route path="audit-log" element={<Audit d={d} />} />
          <Route path="reports" element={<Reports d={d} />} />
          <Route
            path="money-operations"
            element={
              <MoneyOps
                d={d}
                setAccounts={setAccounts}
                setTransactions={setTransactions}
                setAuditLogs={setAuditLogs}
                notify={notify}
              />
            }
          />
        </Route>
      </Routes>
      {toast && (
        <div className="toast">
          {toast}
          <button onClick={() => setToast("")}>×</button>
        </div>
      )}
    </>
  );
}

export default BankApp;