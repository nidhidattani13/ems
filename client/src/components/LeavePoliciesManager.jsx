import { useEffect, useMemo, useState } from 'react';
import { leavePoliciesService } from '../services/leavePoliciesService';
import { designationsService } from '../services/designationsService';
import { leaveTypesService } from '../services/leaveTypesService';

const initialForm = {
  designation_id: '',
  leave_type_id: '',
  year_limit: 0,
  months_limit: 0,
  status: 'Active',
};

const LeavePoliciesManager = () => {
  const [items, setItems] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const d = (it.designation?.title || '').toLowerCase();
      const lt = (it.leaveType?.name || '').toLowerCase();
      return !q || d.includes(q) || lt.includes(q);
    });
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [policies, desigs, ltypes] = await Promise.all([
        leavePoliciesService.list(),
        designationsService.list(),
        leaveTypesService.list(),
      ]);
      setItems(Array.isArray(policies) ? policies : []);
      setDesignations(Array.isArray(desigs) ? desigs : []);
      setLeaveTypes(Array.isArray(ltypes) ? ltypes : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to fetch leave policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setSaving(false);
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.designation_id || !form.leave_type_id) {
      setError('Designation and Leave Type are required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        designation_id: Number(form.designation_id),
        leave_type_id: Number(form.leave_type_id),
        year_limit: Number(form.year_limit || 0),
        months_limit: Number(form.months_limit || 0),
        status: form.status === 'Active',
      };
      if (editingId) {
        await leavePoliciesService.update(editingId, payload);
      } else {
        await leavePoliciesService.create(payload);
      }
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e?.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      designation_id: row.designation_id || '',
      leave_type_id: row.leave_type_id || '',
      year_limit: row.year_limit ?? 0,
      months_limit: row.months_limit ?? 0,
      status: row.status ? 'Active' : 'Inactive',
    });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!confirm('Delete this leave policy?')) return;
    try {
      await leavePoliciesService.remove(row.id);
      await fetchAll();
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed');
    }
  };

  const designationTitle = (id) => designations.find((d) => String(d.id) === String(id))?.title || rowDesignationTitleFallback(id);
  const rowDesignationTitleFallback = (id) => items.find((p) => String(p.designation_id) === String(id))?.designation?.title || '—';
  const leaveTypeName = (id) => leaveTypes.find((t) => String(t.id) === String(id))?.name || '—';

  return (
    <section className="policies-wrap">
      <div className="designations-toolbar">
        <h2>Leave Policies</h2>
        <div className="designations-actions">
          <input
            type="text"
            placeholder="Search by designation or leave type..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="dep-input"
          />
          <button className="btn primary" onClick={() => { setEditingId(null); setForm(initialForm); setModalOpen(true); }}>
            Add Policy
          </button>
        </div>
      </div>

      {error && <div className="dep-alert error">{error}</div>}

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Leave Policy' : 'Add Leave Policy'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="lp-form-grid">
                <div className="dep-field">
                  <label>Designation *</label>
                  <select value={form.designation_id} onChange={(e) => setForm((s) => ({ ...s, designation_id: e.target.value }))} className="dep-input" required>
                    <option value="">Select Designation</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
                <div className="dep-field">
                  <label>Leave Type *</label>
                  <select value={form.leave_type_id} onChange={(e) => setForm((s) => ({ ...s, leave_type_id: e.target.value }))} className="dep-input" required>
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="dep-field">
                  <label>Year Limit</label>
                  <input type="number" min="0" value={form.year_limit} onChange={(e) => setForm((s) => ({ ...s, year_limit: e.target.value }))} className="dep-input" />
                </div>
                <div className="dep-field">
                  <label>Months Limit</label>
                  <input type="number" min="0" value={form.months_limit} onChange={(e) => setForm((s) => ({ ...s, months_limit: e.target.value }))} className="dep-input" />
                </div>
                <div className="dep-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))} className="dep-input">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}</button>
                <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dep-table-card">
        <div className="dep-table-head">
          <span>Total: {items.length}</span>
          <button className="btn refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="dep-table-wrap" style={{maxHeight: 420, overflowY: 'auto'}}>
          <table className="dep-table">
            <thead>
              <tr>
                <th style={{width:'60px'}}>ID</th>
                <th>Designation</th>
                <th>Leave Type</th>
                <th style={{width:'120px'}}>Year Limit</th>
                <th style={{width:'140px'}}>Months Limit</th>
                <th style={{width:'120px'}}>Status</th>
                <th style={{width:'160px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="center">Loading...</td>
                </tr>
              ) : filtered.length ? (
                paginated.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.designation?.title || designationTitle(row.designation_id)}</td>
                    <td>{row.leaveType?.name || leaveTypeName(row.leave_type_id)}</td>
                    <td>{row.year_limit ?? 0}</td>
                    <td>{row.months_limit ?? 0}</td>
                    <td>
                      <span className={`badge ${row.status ? 'success' : 'muted'}`}>{row.status ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn small" onClick={() => handleEdit(row)}>Edit</button>
                        <button className="btn small danger" onClick={() => handleDelete(row)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="center">No leave policies found</td>
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

      <style>{`
        .policies-wrap { display: grid; gap: 20px; }
        .designations-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px }
        .designations-toolbar h2 { font-size:22px; color:#1f2937; font-weight:700 }
        .designations-actions { display:flex; gap:10px; align-items:center }
        .dep-input { padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; background:#fff }
        .dep-input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15) }
        .lp-form-grid { display:grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap:16px; align-items:start }
        .dep-field { display:flex; flex-direction:column; gap:8px }
        .btn { padding:10px 14px; border-radius:8px; border:none; cursor:pointer; font-weight:600; font-size:14px }
        .btn.primary { background:#2563eb; color:#fff }
        .btn.primary:hover { background:#1d4ed8 }
        .btn.ghost { background:#f3f4f6; color:#374151 }
        .btn.ghost:hover { background:#e5e7eb }
        .btn.refresh { background:#f3f4f6 }
        .btn.refresh:hover { background:#e5e7eb }
        .btn.small { padding:8px 10px }
        .btn.danger { background:#ef4444; color:#fff }
        .btn.danger:hover { background:#dc2626 }
        .dep-table-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.04) }
        .dep-table-head { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #e5e7eb; color:#4b5563 }
        .dep-table-wrap { width:100%; overflow-x:auto }
        .dep-table { width:100%; border-collapse:collapse }
        .dep-table th, .dep-table td { padding:12px 16px; border-bottom:1px solid #f1f5f9; text-align:left }
        .dep-table th { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:#6b7280; background:#fafbfc }
        .center { text-align:center; color:#6b7280 }
        .row-actions { display:flex; gap:8px }
        .badge { padding:6px 10px; border-radius:999px; font-size:12px; font-weight:700 }
        .badge.success { background:#ecfdf5; color:#065f46; border:1px solid #d1fae5 }
        .badge.muted { background:#f3f4f6; color:#374151; border:1px solid #e5e7eb }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; padding:20px; z-index:1000 }
        .modal { background:#fff; border-radius:14px; width:100%; max-width:980px; box-shadow:0 20px 60px rgba(0,0,0,.2); border:1px solid #e5e7eb }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e5e7eb }
        .modal-header h3 { margin:0; font-size:18px; color:#111827; font-weight:700 }
        .modal-close { background:transparent; border:none; font-size:22px; line-height:1; cursor:pointer; padding:4px 8px }
        .modal form { padding:16px 20px }
        @media (max-width: 1100px){ .lp-form-grid { grid-template-columns: repeat(2, minmax(220px,1fr)); } }
        @media (max-width: 700px){ .lp-form-grid { grid-template-columns: 1fr; } }
      `}</style>
    </section>
  );
};

export default LeavePoliciesManager;
