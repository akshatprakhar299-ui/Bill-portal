import { useEffect, useMemo, useState } from "react";
import { FileUp } from "lucide-react";

import BillTable from "../../components/BillTable";
import { getMyBills, resubmitBill } from "../../services/billService";

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState(null);
  const [eventName, setEventName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setBills(await getMyBills());
    } catch {}
  }

  function openResubmit(bill) {
    setSelected(bill);
    setEventName(bill.event_name);
    setAmount(String(bill.amount));
    setDescription(bill.description || "");
    setFile(null);
    setError("");
  }

  async function handleResubmit(event) {
    event.preventDefault();
    if (!selected || !file) {
      setError("Please select the revised bill file.");
      return;
    }

    const formData = new FormData();
    formData.append("event_name", eventName);
    formData.append("amount", amount);
    formData.append("description", description);
    formData.append("file", file);

    setLoading(true);
    setError("");
    try {
      await resubmitBill(selected.id, formData);
      setSelected(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not resubmit the bill.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return bills;

    if (filter === "APPROVED") {
      return bills.filter((b) => b.status === "ADMIN_APPROVED");
    }

    if (filter === "UNAPPROVED") {
      return bills.filter((b) => b.status !== "ADMIN_APPROVED");
    }

    return bills.filter((b) => b.status === filter);
  }, [bills, filter]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">CORE MEMBER</span>
          <h2>My bills</h2>
          <p>Uploaded bills and their current approval status.</p>
        </div>
      </div>

      <div className="filter-bar">
        <button className={filter === "ALL" ? "filter active" : "filter"} onClick={() => setFilter("ALL")}>All</button>
        <button className={filter === "UNAPPROVED" ? "filter active" : "filter"} onClick={() => setFilter("UNAPPROVED")}>Unapproved</button>
        <button className={filter === "APPROVED" ? "filter active" : "filter"} onClick={() => setFilter("APPROVED")}>Approved</button>
        <button className={filter === "CHANGES_REQUESTED" ? "filter active" : "filter"} onClick={() => setFilter("CHANGES_REQUESTED")}>Changes Requested</button>
        <button className={filter === "EXECUTIVE_REJECTED" ? "filter active" : "filter"} onClick={() => setFilter("EXECUTIVE_REJECTED")}>Executive Rejected</button>
        <button className={filter === "ADMIN_REJECTED" ? "filter active" : "filter"} onClick={() => setFilter("ADMIN_REJECTED")}>Admin Rejected</button>
      </div>

      <section className="section-card">
        <BillTable
          bills={filtered}
          onBillDeleted={(deletedId) =>
            setBills((currentBills) =>
              currentBills.filter((bill) => bill.id !== deletedId)
            )
          }
          actions={(bill) =>
            bill.status === "CHANGES_REQUESTED" ? (
              <button
                type="button"
                className="small-btn"
                onClick={() => openResubmit(bill)}
              >
                <FileUp size={14} /> Upload revision
              </button>
            ) : null
          }
        />
      </section>

      {selected && (
        <div className="modal-backdrop" onClick={() => !loading && setSelected(null)}>
          <form
            className="modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleResubmit}
          >
            <h3>Update bill</h3>
            <p>Address the executive feedback and submit the revised bill for review.</p>
            {error && <div className="alert error">{error}</div>}
            <div>
              <label htmlFor="resubmit-event-name">Event name *</label>
              <input
                id="resubmit-event-name"
                value={eventName}
                onChange={(event) => setEventName(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="resubmit-amount">Bill amount (₹) *</label>
              <input
                id="resubmit-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="resubmit-description">Description / notes</label>
              <textarea
                id="resubmit-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows="3"
              />
            </div>
            <div>
              <label htmlFor="resubmit-file">Revised bill document *</label>
              <input
                id="resubmit-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required
              />
              <small>PDF, JPG, JPEG or PNG • Maximum 10 MB</small>
            </div>
            <div className="form-actions">
              <button
                className="secondary-btn"
                type="button"
                disabled={loading}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
              <button className="primary-btn" disabled={loading}>
                <FileUp size={16} />
                {loading ? "Submitting..." : "Resubmit for review"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
