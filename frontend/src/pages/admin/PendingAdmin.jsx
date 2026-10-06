import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import BillTable from "../../components/BillTable";
import {
  approveAdmin,
  getPendingAdminBills,
  rejectAdmin,
} from "../../services/billService";

export default function PendingAdmin() {
  const [bills, setBills] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setBills(await getPendingAdminBills());
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load bills.");
    }
  }

  async function approve(id) {
    if (!window.confirm("This is the final approval. Continue?")) return;

    setLoading(true);
    try {
      await approveAdmin(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Final approval failed.");
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!selected) return;

    if (!reason.trim()) {
      setError("Enter a rejection reason.");
      return;
    }

    setLoading(true);
    try {
      await rejectAdmin(selected.id, reason);
      setSelected(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Rejection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN FINAL APPROVAL</span>
          <h2>Pending final approvals</h2>
          <p>These bills have already been approved by an Executive.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="section-card">
        <BillTable
          bills={bills}
          onBillDeleted={(deletedId) =>
            setBills((currentBills) =>
              currentBills.filter((bill) => bill.id !== deletedId)
            )
          }
          actions={(bill) => (
            <div className="action-row">
              <button className="approve-btn" disabled={loading} onClick={() => approve(bill.id)}>
                <Check size={14} /> Final approve
              </button>
              <button className="reject-btn" disabled={loading} onClick={() => { setSelected(bill); setReason(""); }}>
                <X size={14} /> Reject
              </button>
            </div>
          )}
        />
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject bill</h3>
            <p>
              Give a clear reason for rejecting <strong>{selected.event_name}</strong>.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="5"
              placeholder="Reason for rejection..."
              autoFocus
            />
            <div className="form-actions">
              <button className="secondary-btn" onClick={() => setSelected(null)}>Cancel</button>
              <button className="reject-btn filled" disabled={loading} onClick={reject}>
                {loading ? "Rejecting..." : "Confirm rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
