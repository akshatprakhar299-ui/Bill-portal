import { useEffect, useMemo, useState } from "react";
import BillTable from "../../components/BillTable";
import { getAllBills } from "../../services/billService";

export default function AllBills() {
  const [bills, setBills] = useState([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setBills(await getAllBills());
    } catch {}
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return bills;
    return bills.filter((bill) => bill.status === filter);
  }, [bills, filter]);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRATION</span>
          <h2>All bills</h2>
          <p>Complete expense overview across ACES.</p>
        </div>
      </div>

      <div className="filter-bar">
        <button className={filter === "ALL" ? "filter active" : "filter"} onClick={() => setFilter("ALL")}>All</button>
        <button className={filter === "PENDING_ADMIN" ? "filter active" : "filter"} onClick={() => setFilter("PENDING_ADMIN")}>Pending Admin</button>
        <button className={filter === "ADMIN_APPROVED" ? "filter active" : "filter"} onClick={() => setFilter("ADMIN_APPROVED")}>Approved</button>
        <button className={filter === "ADMIN_REJECTED" ? "filter active" : "filter"} onClick={() => setFilter("ADMIN_REJECTED")}>Rejected</button>
        <button className={filter === "PENDING_EXECUTIVE" ? "filter active" : "filter"} onClick={() => setFilter("PENDING_EXECUTIVE")}>Pending Executive</button>
      </div>

      <section className="section-card">
        <BillTable bills={filtered} />
      </section>
    </>
  );
}
