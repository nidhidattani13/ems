import { useEffect, useMemo, useRef, useState } from 'react';
import { employeesService } from '../services/employeesService';
import { departmentsService } from '../services/departmentsService';
import { designationsService } from '../services/designationsService';

const initialForm = {
  name: '',
  email: '',
  password: '',
  department_id: '',
  designation_id: '',
  reporting_head_id: '',
  role: 'employee',
  status: 'Active',
};

const EmployeesManager = () => {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [employees, setEmployees] = useState([]); // for reporting head

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const prevDeptRef = useRef('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesText = !q || String(it.name || '').toLowerCase().includes(q) || String(it.email || '').toLowerCase().includes(q);
      const matchesDept = !deptFilter || String(it.department_id) === String(deptFilter);
      return matchesText && matchesDept;
    });
  }, [items, query, deptFilter]);

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
      const [emps, depts] = await Promise.all([
        employeesService.list().catch((e) => {
          // If not authorized, show friendly error
          throw new Error(e?.response?.data?.message || 'Failed to load employees (admin only)');
        }),
        departmentsService.list(),
      ]);
      setItems(Array.isArray(emps) ? emps : []);
      setEmployees(Array.isArray(emps) ? emps : []); // for head dropdown
      setDepartments(Array.isArray(depts) ? depts : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDesignationsFor = async (department_id) => {
    if (!department_id) {
      setDesignations([]);
      return;
    }
    try {
      const list = await designationsService.listByDepartment(department_id);
      setDesignations(Array.isArray(list) ? list : []);
    } catch {
      setDesignations([]);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    // Always fetch designations for the current department
    Promise.resolve(fetchDesignationsFor(form.department_id)).finally(() => {
      // Only clear designation if the department actually changed (user action)
      if (prevDeptRef.current !== '' && prevDeptRef.current !== form.department_id) {
        setForm((s) => ({ ...s, designation_id: '' }));
      }
      prevDeptRef.current = form.department_id || '';
    });
  }, [form.department_id]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setSaving(false);
    setModalOpen(false);
    setFieldErrors({});
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const nameRegex = /^[A-Za-z .]{2,}$/; // letters, space, dot
  const pwdRegex = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{7,}$/; // >6 chars, number and special

  const computeErrors = (draft, isEdit) => {
    const errs = {};
    if (!draft.name?.trim() || !nameRegex.test(draft.name.trim())) {
      errs.name = 'Enter a valid name (alphabets, space and dot)';
    }
    if (!draft.email?.trim() || !emailRegex.test(draft.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!isEdit || draft.password) {
      if (!draft.password) {
        errs.password = 'Password is required';
      } else if (!pwdRegex.test(draft.password)) {
        errs.password = 'Password must be 7+ chars with a number and a special character';
      }
    }
    if (!draft.department_id) errs.department_id = 'Department is required';
    if (!draft.designation_id) errs.designation_id = 'Designation is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const errs = computeErrors(form, !!editingId);
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError('Please fix the highlighted fields');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        department_id: Number(form.department_id),
        designation_id: Number(form.designation_id),
        reporting_head_id: form.reporting_head_id ? Number(form.reporting_head_id) : null,
        role: form.role,
        status: form.status === 'Active',
      };
      if (form.password) payload.password = form.password;

      if (editingId) {
        await employeesService.update(editingId, payload);
      } else {
        await employeesService.create(payload);
      }
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e?.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      email: row.email || '',
      password: '',
      department_id: row.department_id || '',
      designation_id: row.designation_id || '',
      reporting_head_id: row.reporting_head_id || '',
      role: row.role?.toLowerCase?.() || 'employee',
      status: (row.status===true || String(row.status)==='Active') ? 'Active' : 'Inactive',
    });
    // Prefetch designations for the employee's department so dropdown is populated
    await fetchDesignationsFor(row.department_id);
    prevDeptRef.current = row.department_id || '';
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete employee "${row.name}"?`)) return;
    try {
      await employeesService.remove(row.id);
      await fetchAll();
    } catch (e) {
      setError(e?.response?.data?.message || 'Delete failed');
    }
  };

  const deptName = (id) => departments.find((d) => String(d.id) === String(id))?.name || '—';
  const desigTitle = (id) => designations.find((t) => String(t.id) === String(id))?.title || '—';

  return (
    <section className="employees-wrap">
      <div className="designations-toolbar">
        <h2>Employees</h2>
        <div className="designations-actions">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="dep-input"
          />
          <select
            className="dep-input"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            className="btn primary"
            onClick={() => { setEditingId(null); setForm(initialForm); setModalOpen(true); }}
          >
            Add Employee
          </button>
        </div>
      </div>

      {error && <div className="dep-alert error">{error}</div>}

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="emp-form-grid">
                <div className="dep-field">
                  <label>Name *</label>
                  <input type="text" value={form.name} onChange={(e) => { setForm((s) => ({ ...s, name: e.target.value })); setFieldErrors((fe)=>({...fe, name: undefined})); }} className="dep-input" required />
                  {fieldErrors.name && <small className="field-error">{fieldErrors.name}</small>}
                </div>
                <div className="dep-field">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={(e) => { setForm((s) => ({ ...s, email: e.target.value })); setFieldErrors((fe)=>({...fe, email: undefined})); }} className="dep-input" required />
                  {fieldErrors.email && <small className="field-error">{fieldErrors.email}</small>}
                </div>
                <div className="dep-field">
                  <label>{editingId ? 'Password (optional)' : 'Password *'}</label>
                  <input type="password" value={form.password} onChange={(e) => { setForm((s) => ({ ...s, password: e.target.value })); setFieldErrors((fe)=>({...fe, password: undefined})); }} className="dep-input" required={!editingId} />
                  {fieldErrors.password && <small className="field-error">{fieldErrors.password}</small>}
                </div>
                <div className="dep-field">
                  <label>Department *</label>
                  <select value={form.department_id} onChange={(e) => { setForm((s) => ({ ...s, department_id: e.target.value })); setFieldErrors((fe)=>({...fe, department_id: undefined})); }} className="dep-input" required>
                    <option value="">Select Department</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  {fieldErrors.department_id && <small className="field-error">{fieldErrors.department_id}</small>}
                </div>
                <div className="dep-field">
                  <label>Designation *</label>
                  <select value={form.designation_id} onChange={(e) => { setForm((s) => ({ ...s, designation_id: e.target.value })); setFieldErrors((fe)=>({...fe, designation_id: undefined})); }} className="dep-input" required disabled={!form.department_id}>
                    <option value="">Select Designation</option>
                    {designations.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
                  </select>
                  {fieldErrors.designation_id && <small className="field-error">{fieldErrors.designation_id}</small>}
                </div>
                <div className="dep-field">
                  <label>Reporting Head</label>
                  <select value={form.reporting_head_id} onChange={(e) => setForm((s) => ({ ...s, reporting_head_id: e.target.value }))} className="dep-input">
                    <option value="">None</option>
                    {employees.map((e) => (<option key={e.id} value={e.id}>{e.name} ({e.email})</option>))}
                  </select>
                </div>
                <div className="dep-field">
                  <label>Role</label>
                  <select value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))} className="dep-input">
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
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
        <div className="dep-table-wrap">
          <table className="dep-table">
            <thead>
              <tr>
                <th style={{width:'60px'}}>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Designation</th>
                <th style={{width:'110px'}}>Role</th>
                <th style={{width:'110px'}}>Status</th>
                <th style={{width:'160px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="center">Loading...</td>
                </tr>
              ) : filtered.length ? (
                paginated.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{deptName(row.department_id)}</td>
                    <td>{row.designation?.title || desigTitle(row.designation_id)}</td>
                    <td>
                      <span className="badge muted">{String(row.role || '').toLowerCase()}</span>
                    </td>
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
                  <td colSpan={8} className="center">No employees found</td>
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
        .employees-wrap { display: grid; gap: 20px; }
        .dep-input { padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:14px; background:#fff; }
        .dep-input:focus { outline:none; border-color:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.15) }
        .dep-form { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.04) }
        .designations-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px }
        .designations-toolbar h2 { font-size:22px; color:#1f2937; font-weight:700 }
        .designations-actions { display:flex; gap:10px; align-items:center }
        .emp-form-grid { display:grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap:16px; align-items:start }
        .dep-field { display:flex; flex-direction:column; gap:8px }
        .dep-field label { font-size:12px; font-weight:600; color:#374151 }
        .field-error { color:#b91c1c; font-size:12px }
        .dep-form-actions { display:flex; gap:10px; margin-top:4px }
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
        .dep-table-wrap { width:100%; overflow-x:auto; max-height: 420px; overflow-y: auto }
        .pagination { display:flex; align-items:center; justify-content:space-between; padding:12px 16px }
        .pagination-left { display:flex; align-items:center; gap:8px; color:#4b5563 }
        .pagination-right { display:flex; align-items:center; gap:10px }
        .page-indicator { color:#4b5563; font-weight:600 }
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
        .modal-actions { display:flex; gap:10px; justify-content:flex-end; margin-top:16px }
        @media (max-width: 1100px){ .emp-form-grid { grid-template-columns: repeat(2, minmax(220px,1fr)) } }
        @media (max-width: 700px){ .emp-form-grid { grid-template-columns: 1fr } }
      `}</style>
    </section>
  );
};

export default EmployeesManager;
