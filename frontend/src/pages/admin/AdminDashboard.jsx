import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, IndianRupee, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

import api from "../../services/api";
import StatCard from "../../components/StatCard";

export default function AdminDashboard() {
  const [pending, setPending] = useState([]);
  const [all, setAll] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [pendingResponse, allResponse] = await Promise.all([
        api.get("/bills/pending-admin"),
        api.get("/bills/all"),
      ]);
      setPending(pendingResponse.data);
      setAll(allResponse.data);
    } catch {}
  }

  const approved = all.filter((b) => b.status === "ADMIN_APPROVED");
  const totalApprovedAmount = approved.reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN • FINAL AUTHORITY</span>
          <h2>Administration dashboard</h2>
          <p>Final approval for ACES event expenses.</p>
        </div>
        <Link className="primary-btn" to="/admin/pending">
          <ListChecks size={18} /> Review final approvals
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Pending final approval" value={pending.length} icon={<Clock3 size={21} />} tone="orange" />
        <StatCard label="Final approved" value={approved.length} icon={<CheckCircle2 size={21} />} tone="green" />
        <StatCard label="Total bills" value={all.length} icon={<ListChecks size={21} />} />
        <StatCard label="Approved amount" value={`₹${totalApprovedAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} icon={<IndianRupee size={21} />} tone="green" />
      </div>

      <section className="section-card">
        <div className="section-head">
          <div>
            <h3>Awaiting your final approval</h3>
            <p>Only Executive-approved bills appear here.</p>
          </div>
          <Link className="text-link" to="/admin/pending">Open queue</Link>
        </div>

        <div className="mini-list">
          {pending.slice(0, 5).map((bill) => (
            <div className="mini-row" key={bill.id}>
              <div>
                <strong>{bill.event_name}</strong>
                <span>Submitted by {bill.uploader_name}</span>
              </div>
              <div className="mini-right">
                <strong>₹{Number(bill.amount).toLocaleString("en-IN")}</strong>
                <Link className="small-btn" to="/admin/pending">Review</Link>
              </div>
            </div>
          ))}
          {!pending.length && <div className="empty-small">No bills are waiting for final approval.</div>}
        </div>
      </section>
    </>
  );
}
