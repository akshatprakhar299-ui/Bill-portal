import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileUp, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import api from "../../services/api";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";

export default function CoreDashboard() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/bills/my");
      setBills(data);
    } catch {}
  }

  const pending = bills.filter(
    (b) =>
      b.status === "PENDING_EXECUTIVE" ||
      b.status === "PENDING_ADMIN" ||
      b.status === "CHANGES_REQUESTED"
  ).length;

  const approved = bills.filter(
    (b) => b.status === "ADMIN_APPROVED"
  ).length;

  const rejected = bills.filter(
    (b) => b.status === "ADMIN_REJECTED" || b.status === "EXECUTIVE_REJECTED"
  ).length;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CORE MEMBER DASHBOARD</span>
          <h2>Expense overview</h2>
          <p>Submit bills and follow their approval journey.</p>
        </div>
        <Link className="primary-btn" to="/core/upload">
          <FileUp size={18} />
          Upload new bill
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Total uploaded" value={bills.length} icon={<FileUp size={21} />} />
        <StatCard label="Pending" value={pending} icon={<Clock3 size={21} />} tone="orange" />
        <StatCard label="Final approved" value={approved} icon={<CheckCircle2 size={21} />} tone="green" />
        <StatCard label="Rejected" value={rejected} icon={<XCircle size={21} />} tone="red" />
      </div>

      <section className="section-card">
        <div className="section-head">
          <div>
            <h3>Recent bills</h3>
            <p>Your latest submissions.</p>
          </div>
          <Link to="/core/bills" className="text-link">View all</Link>
        </div>

        {bills.length === 0 ? (
          <div className="empty-state">
            <h3>No bills uploaded yet</h3>
            <p>Upload your first event bill to start the approval workflow.</p>
            <Link className="primary-btn" to="/core/upload">Upload bill</Link>
          </div>
        ) : (
          <div className="mini-list">
            {bills.slice(0, 5).map((bill) => (
              <div className="mini-row" key={bill.id}>
                <div>
                  <strong>{bill.event_name}</strong>
                  <span>{new Date(bill.created_at).toLocaleString("en-IN")}</span>
                </div>
                <div className="mini-right">
                  <strong>₹{Number(bill.amount).toLocaleString("en-IN")}</strong>
                  <StatusBadge status={bill.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
