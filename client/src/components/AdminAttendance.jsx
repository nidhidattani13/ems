import { useEffect, useMemo, useState } from "react";
import { attendanceService } from "../services/attendanceService";
import { employeeService } from "../services/employeeService";

const workingDaysInMonth = (year, month /* 1-12 */) => {
  const m = month - 1;
  const start = new Date(year, m, 1);
  const end = new Date(year, m + 1, 0);
  let count = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1; // Mon-Fri
  }
  return count;
};

const fmtTime = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return "-";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const AdminAttendance = () => {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empMap, setEmpMap] = useState({}); // id -> employee detail
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async (m, y) => {
    try {
      setLoading(true);
      setError("");
      const data = await attendanceService.listAll({ month: Number(m), year: Number(y) });
      const list = Array.isArray(data) ? data : [];
      setRows(list);

      // Build unique employee IDs
      const ids = Array.from(new Set(list.map(r => r.employee_id || r.employee?.id).filter(Boolean)));
      const newMap = {};
      // Fetch employees in parallel
      await Promise.all(ids.map(async (id) => {
        try {
          const emp = await employeeService.getById(id);
          if (emp?.id) newMap[id] = emp;
        } catch (e) {
          // ignore individual fetch errors to keep rest of data
        }
      }));
      setEmpMap(newMap);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(month, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const byEmp = new Map();
    for (const r of rows) {
      const id = r.employee_id || r.employee?.id;
      if (!id) continue;
      const emp = empMap[id] || r.employee || { id };
      if (!byEmp.has(id)) {
        byEmp.set(id, {
          employee: emp,
          records: [],
        });
      }
      byEmp.get(id).records.push(r);
    }
    // compute summaries
    const workDays = workingDaysInMonth(Number(year), Number(month));
    const list = [];
    for (const [, val] of byEmp.entries()) {
      const presentDays = val.records.filter((rec) => rec.sign_in_time && rec.sign_out_time).length;
      // last record in the month (sorted desc by date in API). But ensure it's actually latest
      const latest = [...val.records].sort((a, b) => new Date(b.date || b.attendance_date) - new Date(a.date || a.attendance_date))[0];
      list.push({
        employee: val.employee,
        latest,
        presentDays,
        workDays,
        percentage: workDays ? Math.round((presentDays / workDays) * 100) : 0,
      });
    }
    // sort by employee name
    list.sort((a, b) => (a.employee?.name || "").localeCompare(b.employee?.name || ""));
    return list;
  }, [rows, month, year, empMap]);

  const totalPages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return grouped.slice(start, start + pageSize);
  }, [grouped, pageSafe, pageSize]);

  const onMonthChange = (e) => {
    const value = e.target.value; // format YYYY-MM
    if (!value) return;
    const [y, m] = value.split("-");
    setYear(y);
    setMonth(m);
    load(m, y);
  };

  const monthInputValue = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <section className="apply-leave-wrap">
      <div className="designations-toolbar">
        <h2>Attendance</h2>
        <div className="designations-actions">
          <input
            type="month"
            value={monthInputValue}
            onChange={onMonthChange}
            className="month-input"
          />
          <button className="btn refresh" onClick={() => load(month, year)} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="dep-alert error">{error}</div>}

      <div className="dep-table-card">
        <div className="dep-table-head">
          <span>Month: {monthInputValue}</span>
          <span style={{ marginLeft: "auto" }}>Employees: {grouped.length}</span>
        </div>
        <div className="dep-table-wrap" style={{maxHeight: 420, overflowY: 'auto'}}>
          <table className="dep-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Last Sign In</th>
                <th>Last Sign Out</th>
                <th>Present Days</th>
                <th>Working Days</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="center">Loading...</td>
                </tr>
              ) : grouped.length ? (
                paginated.map((g) => (
                  <tr key={g.employee.id}>
                    <td>{g.employee.id}</td>
                    <td>{g.employee.name}</td>
                    <td>{g.employee.department?.name || '-'}</td>
                    <td>{g.employee.designation?.title || '-'}</td>
                    <td>{fmtTime(g.latest?.sign_in_time)}</td>
                    <td>{fmtTime(g.latest?.sign_out_time)}</td>
                    <td>{g.presentDays}</td>
                    <td>{g.workDays}</td>
                    <td>
                      <span className={`badge ${g.percentage >= 75 ? 'success' : g.percentage >= 50 ? 'warning' : 'danger'}`}>
                        {g.percentage}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="center">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px'}}>
          <div className="pagination-left" style={{display:'flex',alignItems:'center',gap:8,color:'#4b5563'}}>
            <select className="dep-input" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)||10); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>per page</span>
          </div>
          <div className="pagination-right" style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="btn small" disabled={pageSafe===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span className="page-indicator" style={{color:'#4b5563',fontWeight:600}}>Page {pageSafe} of {totalPages}</span>
            <button className="btn small" disabled={pageSafe===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminAttendance;
