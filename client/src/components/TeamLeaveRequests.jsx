import { useEffect, useMemo, useState } from 'react';
import { leaveRequestsService } from '../services/leaveRequestsService';
import { useAuth } from '../context/AuthContext';

const TeamLeaveRequests = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      String(r.employee?.name || '').toLowerCase().includes(q) ||
      String(r.leaveType?.name || '').toLowerCase().includes(q) ||
      String(r.leave_status || r.status || '').toLowerCase().includes(q)
    );
  }, [items, query]);

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
      const data = await leaveRequestsService.teamList();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to fetch team leave requests');
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
        <h2>Team Leave Requests</h2>
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
        <div className="dep-table-head">
          <span>Total: {items.length}</span>
        </div>
        <div className="dep-table-wrap">
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
                filtered.map((row) => (
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
      </div>
    </section>
  );
};

export default TeamLeaveRequests;
