import { useEffect, useMemo, useState } from "react";
import BillTable from "../../components/BillTable";
import { getMyBills } from "../../services/billService";

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setBills(await getMyBills());
    } catch {}
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
        <button className={filter === "EXECUTIVE_REJECTED" ? "filter active" : "filter"} onClick={() => setFilter("EXECUTIVE_REJECTED")}>Rejected</button>
        <button className={filter === "ADMIN_REJECTED" ? "filter active" : "filter"} onClick={() => setFilter("ADMIN_REJECTED")}>Admin Rejected</button>
      </div>

      <section className="section-card">
        <BillTable bills={filtered} />
      </section>
    </>
  );
}
