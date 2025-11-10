import { useEffect, useMemo, useState } from 'react';
import { departmentsService } from '../services/departmentsService';

const initialForm = { name: '', status: 'Active' };

const DepartmentsManager = () => {
  const [items, setItems] = useState([]);
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
  if (!q) return items;

  return items.filter((it) =>
    String(it.name || "")
      .toLowerCase()
      .includes(q) ||
    String(it.status || "")
      .toLowerCase()
      .includes(q)
  );
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
      const data = await departmentsService.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setSaving(false);
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!form.name?.trim()) {
      setError('Name is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = { name: form.name.trim(), status: form.status === 'Active' };
      if (editingId) {
        await departmentsService.update(editingId, payload);
      } else {
        await departmentsService.create(payload);
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
    setForm({ name: row.name || '', status: (row.status===true || String(row.status)==='Active') ? 'Active' : 'Inactive' });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete department "${row.name}"?`)) return;
    try {
      await departmentsService.remove(row.id);
      await fetchAll();
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <section className="departments-wrap">
      <div className="departments-toolbar">
        <h2>Departments</h2>
        <div className="departments-actions">
          <input
            type="text"
            placeholder="Search departments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="dep-input"
          />
          <button
            className="btn primary"
            onClick={() => { setEditingId(null); setForm(initialForm); setModalOpen(true); }}
          >
            Add Department
          </button>
        </div>
      </div>

      {error && <div className="dep-alert error">{error}</div>}

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Department' : 'Add Department'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="dep-form-row">
                <div className="dep-field">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder="e.g., Engineering"
                    className="dep-input"
                    required
                  />
                </div>
                <div className="dep-field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((s) => ({ ...s, status: e.target.value }))}
                    className="dep-input"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="dep-form-actions">
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
        <div className="dep-table-wrap">
          <table className="dep-table">
            <thead>
              <tr>
                <th style={{width: '60px'}}>ID</th>
                <th>Name</th>
                <th style={{width: '140px'}}>Status</th>
                <th style={{width: '160px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="center">Loading...</td>
                </tr>
              ) : filtered.length ? (
                paginated.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>
                      <span className={`badge ${(row.status===true || String(row.status)==='Active') ? 'success' : 'muted'}`}>
                        {(row.status===true || String(row.status)==='Active') ? 'Active' : 'Inactive'}
                      </span>
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
                  <td colSpan={4} className="center">No departments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <div className="pagination-left">
            <select className="dep-input" value={pageSize} onChange={(e)=>{ setPageSize(Number(e.target.value)||10); setPage(1); }}>
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>per page</span>
          </div>
          <div className="pagination-right">
            <button className="btn small" disabled={pageSafe===1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
            <span className="page-indicator">Page {pageSafe} of {totalPages}</span>
            <button className="btn small" disabled={pageSafe===totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</button>
          </div>
        </div>
      </div>

      <style>{`
        .departments-wrap { display: grid; gap: 20px; }
        .departments-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px }
        .departments-toolbar h2 { font-size: 22px; color:#1f2937; font-weight:700; }
        .departments-actions { display:flex; gap:10px; align-items:center }
        .dep-input { padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; background:#fff; }
        .dep-input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15) }
        .dep-form { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.04) }
        .dep-form-row { display:grid; grid-template-columns: 1fr 200px; gap:16px; }
        .dep-field { display:flex; flex-direction:column; gap:8px; }
        .dep-field label { font-size:12px; font-weight:600; color:#374151; }
        .dep-form-actions { display:flex; gap:10px; margin-top:4px; }
        .btn { padding:10px 14px; border-radius:8px; border:none; cursor:pointer; font-weight:600; font-size:14px; }
        .btn.primary { background:#2563eb; color:#fff; }
        .btn.primary:hover { background:#1d4ed8 }
        .btn.ghost { background:#f3f4f6; color:#374151 }
        .btn.ghost:hover { background:#e5e7eb }
        .btn.refresh { background:#f3f4f6; }
        .btn.refresh:hover { background:#e5e7eb }
        .badge.muted { background:#f3f4f6; color:#374151; border:1px solid #e5e7eb }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; padding:20px; z-index:1000 }
        .modal { background:#fff; border-radius:14px; width:100%; max-width:640px; box-shadow:0 20px 60px rgba(0,0,0,.2); border:1px solid #e5e7eb }
        .modal-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e5e7eb }
        .modal-header h3 { margin:0; font-size:18px; color:#111827; font-weight:700 }
        .modal-close { background:transparent; border:none; font-size:22px; line-height:1; cursor:pointer; padding:4px 8px }
        .modal form { padding:16px 20px }
        @media (max-width: 640px){
          .dep-form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </section>
  );
};

export default DepartmentsManager;
