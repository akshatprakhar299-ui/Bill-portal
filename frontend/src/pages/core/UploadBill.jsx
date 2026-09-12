import { useState } from "react";
import { ArrowLeft, FileUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { uploadBill } from "../../services/billService";

export default function UploadBill() {
  const navigate = useNavigate();

  const [eventName, setEventName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select the bill file.");
      return;
    }

    const formData = new FormData();
    formData.append("event_name", eventName);
    formData.append("amount", amount);
    formData.append("description", description);
    formData.append("file", file);

    setLoading(true);

    try {
      await uploadBill(formData);
      setSuccess("Bill uploaded successfully and sent to the Executive team.");
      setEventName("");
      setAmount("");
      setDescription("");
      setFile(null);
      document.getElementById("bill-file").value = "";
    } catch (err) {
      setError(err.response?.data?.detail || "Could not upload the bill.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="back-link" to="/core">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <span className="eyebrow">CORE MEMBER</span>
          <h2>Upload event bill</h2>
          <p>Submit a bill for Executive review.</p>
        </div>
      </div>

      <div className="form-card">
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <form onSubmit={handleSubmit} className="bill-form">
          <div className="form-grid">
            <div>
              <label>Event name *</label>
              <input
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. CodeRush 2026"
                required
              />
            </div>

            <div>
              <label>Bill amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12500"
                required
              />
            </div>
          </div>

          <div>
            <label>Description / notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional information about the expense..."
              rows="4"
            />
          </div>

          <div>
            <label>Bill document *</label>
            <label className="file-drop">
              <FileUp size={28} />
              <strong>{file ? file.name : "Choose bill file"}</strong>
              <span>PDF, JPG, JPEG or PNG • Maximum 10 MB</span>
              <input
                id="bill-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <Link className="secondary-btn" to="/core">Cancel</Link>
            <button className="primary-btn" disabled={loading}>
              <FileUp size={18} />
              {loading ? "Uploading..." : "Submit bill"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
