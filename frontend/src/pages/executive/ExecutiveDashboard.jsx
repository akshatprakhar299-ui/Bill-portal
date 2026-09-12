import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, FileText } from "lucide-react";
import { Link } from "react-router-dom";

import api from "../../services/api";
import StatCard from "../../components/StatCard";

export default function ExecutiveDashboard() {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get("/bills/pending-executive");
      setBills(data);
    } catch {}
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXECUTIVE MEMBER</span>
          <h2>Review centre</h2>
          <p>Check bills submitted by Core Members.</p>
        </div>
        <Link className="primary-btn" to="/executive/pending">
          <FileText size={18} /> Review pending bills
        </Link>
      </div>

      <div className="stats-grid">
        <StatCard label="Awaiting review" value={bills.length} icon={<Clock3 size={21} />} tone="orange" />
        <StatCard label="Workflow" value="2-step" icon={<CheckCircle2 size={21} />} tone="green" />
        <StatCard label="Notifications" value="Live" icon={<AlertCircle size={21} />} />
      </div>

      <section className="section-card">
        <div className="section-head">
          <div>
            <h3>Latest pending bills</h3>
            <p>New submissions appear here automatically.</p>
          </div>
        </div>

        <div className="mini-list">
          {bills.slice(0, 5).map((bill) => (
            <div className="mini-row" key={bill.id}>
              <div>
                <strong>{bill.event_name}</strong>
                <span>Submitted by {bill.uploader_name}</span>
              </div>
              <div className="mini-right">
                <strong>₹{Number(bill.amount).toLocaleString("en-IN")}</strong>
                <Link className="small-btn" to="/executive/pending">Review</Link>
              </div>
            </div>
          ))}
          {!bills.length && <div className="empty-small">No bills are waiting for review.</div>}
        </div>
      </section>
    </>
  );
}
