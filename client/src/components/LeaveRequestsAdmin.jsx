import { useEffect, useMemo, useState } from 'react';
import { leaveRequestsService } from '../services/leaveRequestsService';
import { useAuth } from '../context/AuthContext';

const LeaveRequestsAdmin = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      String(r.employee?.name || '').toLowerCase().includes(q) ||
      String(r.leaveType?.name || '').toLowerCase().includes(q) ||
      String(r.leave_status || r.status || '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const formatDateDMY = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso).slice(0,10);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = d.getFullYear();
    return `${dd}-${mm}-${yy}`;
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await leaveRequestsService.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to fetch leave requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (row, nextStatus) => {
    try {
      setSavingId(row.id);
      setError('');
      await leaveRequestsService.update(row.id, {
        leave_status: nextStatus,
        approved_by: Number(user?.id) || null,
      });
      await fetchAll();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update request');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="leave-requests-admin-wrap">
      <div className="designations-toolbar">
        <h2>Leave Requests</h2>
        <div className="designations-actions">
          <input
            type="text"
            placeholder="Search by employee, type or status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="dep-input"
          />
          <button className="btn refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="dep-alert error">{error}</div>}

      <div className="dep-table-card">
        <div className="dep-table-head" style={{gap:12, flexWrap:'wrap'}}>
          <span>All Requests: {items.length}</span>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <input
              type="text"
              placeholder="Search by employee, type or status..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="dep-input"
              style={{minWidth:220}}
            />
            <button className="btn refresh" onClick={fetchAll} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:12, marginLeft:'auto'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, color:'#4b5563'}}>
              <select className="dep-input" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)||10); setPage(1); }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span>per page</span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <button className="btn small" disabled={pageSafe===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
              <span className="page-indicator" style={{color:'#4b5563',fontWeight:600}}>Page {pageSafe} of {totalPages}</span>
              <button className="btn small" disabled={pageSafe===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
            </div>
          </div>
        </div>
        <div className="dep-table-wrap" style={{maxHeight: 420, overflowY: 'auto'}}>
          <table className="dep-table">
            <thead>
              <tr>
                <th className="col-id">ID</th>
                <th className="col-employee">Employee</th>
                <th className="col-type">Leave Type</th>
                <th className="col-date">Start</th>
                <th className="col-date">End</th>
                <th className="col-bool">Half Day</th>
                <th className="col-session">Session</th>
                <th className="col-status">Status</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="center">Loading...</td></tr>
              ) : filtered.length ? (
                paginated.map((row) => (
                  <tr key={row.id}>
                    <td className="col-id">{row.id}</td>
                    <td className="col-employee">{row.employee?.name || row.employee?.email || '-'}</td>
                    <td className="col-type">{row.leaveType?.name || '-'}</td>
                    <td className="col-date">{formatDateDMY(row.start_date)}</td>
                    <td className="col-date">{formatDateDMY(row.end_date)}</td>
                    <td className="col-bool center">{row.is_half_day ? 'Yes' : 'No'}</td>
                    <td className="col-session">{row.half_day_session || '-'}</td>
                    <td className="col-status">
                      <span className={`badge ${row.leave_status === 'Approved' ? 'success' : row.leave_status === 'Rejected' ? 'muted' : 'muted'}`}>{row.leave_status || 'Pending'}</span>
                    </td>
                    <td className="col-actions">
                      {row.leave_status === 'Pending' ? (
                        <div className="row-actions wrap">
                          <button className="btn small" disabled={savingId===row.id} onClick={() => updateStatus(row, 'Approved')}>
                            {savingId===row.id ? 'Saving...' : 'Approve'}
                          </button>
                          <button className="btn small danger" disabled={savingId===row.id} onClick={() => updateStatus(row, 'Rejected')}>
                            {savingId===row.id ? 'Saving...' : 'Reject'}
                          </button>
                        </div>
                      ) : (
                        <div className="row-actions wrap">
                          <select
                            className="dep-input"
                            value={row.leave_status || 'Pending'}
                            onChange={(e) => updateStatus(row, e.target.value)}
                            disabled={savingId===row.id}
                            style={{maxWidth:'140px'}}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={9} className="center">No requests found</td></tr>
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

export default LeaveRequestsAdmin;
