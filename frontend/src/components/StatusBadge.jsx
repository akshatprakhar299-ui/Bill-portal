const labels = {
  PENDING_EXECUTIVE: "Pending Executive",
  CHANGES_REQUESTED: "Changes Requested",
  EXECUTIVE_REJECTED: "Executive Rejected",
  PENDING_ADMIN: "Pending Admin",
  ADMIN_APPROVED: "Final Approved",
  ADMIN_REJECTED: "Admin Rejected",
};

export default function StatusBadge({ status }) {
  const className =
    status === "ADMIN_APPROVED"
      ? "status approved"
      : status === "CHANGES_REQUESTED"
      ? "status pending"
      : status.includes("REJECTED")
      ? "status rejected"
      : "status pending";

  return (
    <span className={className}>
      {labels[status] || status}
    </span>
  );
}
