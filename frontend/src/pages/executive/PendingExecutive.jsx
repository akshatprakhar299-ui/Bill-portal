import { useEffect, useState } from "react";
import { Check, MessageSquareText, X } from "lucide-react";

import BillTable from "../../components/BillTable";
import {
  approveExecutive,
  getPendingExecutiveBills,
  rejectExecutive,
  requestExecutiveChanges,
} from "../../services/billService";

export default function PendingExecutive() {
  const [bills, setBills] = useState([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [reviewAction, setReviewAction] = useState("changes");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setBills(await getPendingExecutiveBills());
    } catch (err) {
      setError(err.response?.data?.detail || "Could not load bills.");
    }
  }

  async function approve(id) {
    if (!window.confirm("Approve this bill and send it to Admin for final approval?")) return;

    setLoading(true);
    try {
      await approveExecutive(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Approval failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReviewAction() {
    if (!selected) return;

    if (!reason.trim()) {
      setError(reviewAction === "changes" ? "Enter the changes needed." : "Enter a rejection reason.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      if (reviewAction === "changes") {
        await requestExecutiveChanges(selected.id, reason);
      } else {
        await rejectExecutive(selected.id, reason);
      }
      setSelected(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not submit the review decision.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EXECUTIVE APPROVAL</span>
          <h2>Pending bills</h2>
          <p>Review every bill before forwarding it to Admin.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="section-card">
        <BillTable
          bills={bills}
          actions={(bill) => (
            <div className="action-row">
              <button className="approve-btn" disabled={loading} onClick={() => approve(bill.id)}>
                <Check size={14} /> Approve
              </button>
              <button
                type="button"
                className="feedback-btn"
                disabled={loading}
                onClick={() => { setSelected(bill); setReviewAction("changes"); setReason(""); setError(""); }}
              >
                <MessageSquareText size={14} /> Request changes
              </button>
              <button
                type="button"
                className="reject-btn"
                disabled={loading}
                onClick={() => { setSelected(bill); setReviewAction("reject"); setReason(""); setError(""); }}
              >
                <X size={14} /> Reject
              </button>
            </div>
          )}
        />
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => !loading && setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{reviewAction === "changes" ? "Request changes" : "Reject bill"}</h3>
            <p>
              {reviewAction === "changes"
                ? <>Explain what the Core team needs to update for <strong>{selected.event_name}</strong>.</>
                : <>Give a clear reason for rejecting <strong>{selected.event_name}</strong>.</>}
            </p>
            {error && <div className="alert error">{error}</div>}
            <label htmlFor="executive-feedback">
              {reviewAction === "changes" ? "Feedback for the Core team *" : "Rejection reason *"}
            </label>
            <textarea
              id="executive-feedback"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows="5"
              placeholder={reviewAction === "changes" ? "Describe the changes needed..." : "Reason for rejection..."}
              autoFocus
            />
            <div className="form-actions">
              <button
                type="button"
                className="secondary-btn"
                disabled={loading}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={reviewAction === "changes" ? "feedback-btn" : "reject-btn"}
                disabled={loading}
                onClick={submitReviewAction}
              >
                {loading
                  ? "Submitting..."
                  : reviewAction === "changes"
                  ? "Send to Core team"
                  : "Confirm rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
