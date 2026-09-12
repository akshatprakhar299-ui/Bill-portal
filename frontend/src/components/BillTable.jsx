import { ExternalLink, Trash2 } from "lucide-react";

import StatusBadge from "./StatusBadge";
import api from "../services/api";
import { deleteBill } from "../services/billService";

export default function BillTable({ bills, actions, onBillDeleted }) {
  const handleViewBill = async (billId) => {
    const newTab = window.open("", "_blank");

    try {
      const response = await api.get(`/bills/${billId}/file`, {
        responseType: "blob",
      });

      const fileUrl = window.URL.createObjectURL(response.data);

      if (newTab) {
        newTab.location.href = fileUrl;
      } else {
        window.location.href = fileUrl;
      }

      setTimeout(() => {
        window.URL.revokeObjectURL(fileUrl);
      }, 60000);
    } catch (error) {
      if (newTab) {
        newTab.close();
      }

      console.error("Error viewing bill:", error);

      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
      } else if (error.response?.status === 403) {
        alert("You do not have permission to view this bill.");
      } else if (error.response?.status === 404) {
        alert("Bill file was not found.");
      } else {
        alert("Unable to open the bill. Please try again.");
      }
    }
  };

  const handleDeleteBill = async (billId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this bill?\n\nThis action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBill(billId);

      alert("Bill deleted successfully.");

      if (onBillDeleted) {
        onBillDeleted(billId);
      }
    } catch (error) {
      console.error("Error deleting bill:", error);

      if (error.response?.status === 401) {
        alert("Your session has expired. Please login again.");
      } else if (error.response?.status === 403) {
        alert("You do not have permission to delete this bill.");
      } else if (error.response?.status === 404) {
        alert("Bill not found.");
      } else {
        alert("Unable to delete the bill. Please try again.");
      }
    }
  };

  if (!bills.length) {
    return (
      <div className="empty-state">
        <h3>No bills found</h3>
        <p>There are no bills in this section right now.</p>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Submitted By</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Bill</th>
            <th>Delete</th>
            {actions && <th>Action</th>}
          </tr>
        </thead>

        <tbody>
          {bills.map((bill) => (
            <tr key={bill.id}>
              <td>
                <strong>{bill.event_name}</strong>

                {bill.description && (
                  <small className="table-sub">
                    {bill.description}
                  </small>
                )}
              </td>

              <td>{bill.uploader_name}</td>

              <td>
                ₹
                {Number(bill.amount).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </td>

              <td>
                {new Date(bill.created_at).toLocaleDateString("en-IN")}
              </td>

              <td>
                <StatusBadge status={bill.status} />
              </td>

              <td>
                <button
                  type="button"
                  className="file-link"
                  onClick={() => handleViewBill(bill.id)}
                >
                  View <ExternalLink size={14} />
                </button>
              </td>

              <td>
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => handleDeleteBill(bill.id)}
                  title="Delete bill"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </td>

              {actions && <td>{actions(bill)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}