import { useEffect, useMemo, useState } from 'react';
import { leaveRequestsService } from '../services/leaveRequestsService';
import { leaveTypesService } from '../services/leaveTypesService';
import { leavePoliciesService } from '../services/leavePoliciesService';
import { useAuth } from '../context/AuthContext';
import '../styles/ApplyLeave.css';

const initialForm = {
  leave_type_id: '',
  start_date: '',
  end_date: '',
  reason: '',
  is_half_day: false,
  half_day_session: '',
};

// Utility functions
const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const diffDaysInclusive = (a, b) => Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
const toYMD = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const formatDateDMY = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0,10);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
};

// Get today's date at midnight in local timezone
const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Check if date is today or future
const isTodayOrFuture = (dateStr) => {
  if (!dateStr) return false;
  const inputDate = new Date(dateStr + 'T00:00:00');
  if (isNaN(inputDate)) return false;
  const today = getTodayDate();
  return inputDate >= today;
};

// Validate date string format and parse
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr + 'T00:00:00');
  return !isNaN(date) && dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
};

const ApplyLeave = () => {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [policies, setPolicies] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const myDesignationId = user?.designation_id;

  const myPolicyForSelected = useMemo(() => {
    if (!myDesignationId || !form.leave_type_id) return null;
    return policies.find(
      (p) => String(p.designation_id) === String(myDesignationId) && String(p.leave_type_id) === String(form.leave_type_id)
    ) || null;
  }, [policies, myDesignationId, form.leave_type_id]);

  const monthsLimit = myPolicyForSelected ? Number(myPolicyForSelected.months_limit || 0) : 0;

  // Calculate already used days in the same month for selected leave type
  const usedDaysThisMonth = useMemo(() => {
    if (!form.leave_type_id || !form.start_date) return 0;
    if (!items?.length) return 0;
    
    const startDate = new Date(form.start_date + 'T00:00:00');
    if (isNaN(startDate)) return 0;
    
    const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;
    const sameType = String(form.leave_type_id);
    let total = 0;
    
    for (const r of items) {
      if (editingId && r.id === editingId) continue;
      if (String(r.leave_type_id || r.leaveType?.id) !== sameType) continue;
      if (r.leave_status === 'Rejected') continue;
      
      const rs = r.start_date ? new Date(r.start_date) : null;
      const re = r.end_date ? new Date(r.end_date) : null;
      if (!rs || !re || isNaN(rs) || isNaN(re)) continue;
      
      const rKey = `${rs.getFullYear()}-${rs.getMonth()}`;
      if (rKey !== monthKey) continue;
      
      total += diffDaysInclusive(rs, re);
    }
    return total;
  }, [items, form.leave_type_id, form.start_date, editingId]);

  const requestedDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const s = new Date(form.start_date + 'T00:00:00');
    const e = new Date(form.end_date + 'T00:00:00');
    if (isNaN(s) || isNaN(e) || e < s) return 0;
    return diffDaysInclusive(s, e);
  }, [form.start_date, form.end_date]);

  // Comprehensive date validation
  const dateValidationError = useMemo(() => {
    // No validation if dates are empty
    if (!form.start_date && !form.end_date) return '';
    
    // Validate date format
    if (form.start_date && !isValidDate(form.start_date)) {
      return 'Invalid start date format';
    }
    if (form.end_date && !isValidDate(form.end_date)) {
      return 'Invalid end date format';
    }
    
    // Both dates required for further validation
    if (!form.start_date || !form.end_date) return '';
    
    const startDate = new Date(form.start_date + 'T00:00:00');
    const endDate = new Date(form.end_date + 'T00:00:00');
    
    // Check if dates are valid
    if (isNaN(startDate) || isNaN(endDate)) {
      return 'Invalid date selection';
    }
    
    // Check if start date is today or future
    if (!isTodayOrFuture(form.start_date)) {
      return 'Start date must be today or a future date';
    }
    
    // Check if end date is today or future
    if (!isTodayOrFuture(form.end_date)) {
      return 'End date must be today or a future date';
    }
    
    // Check if end date is before start date
    if (endDate < startDate) {
      return 'End date cannot be before start date';
    }
    
    // Check if dates are in same month
    if (!sameMonth(startDate, endDate)) {
      return 'Start date and end date must be in the same month';
    }
    
    // Check monthly limit if applicable
    if (monthsLimit > 0) {
      const remaining = monthsLimit - usedDaysThisMonth;
      if (requestedDays > remaining) {
        return `Insufficient leave balance. Available: ${remaining} day(s), Requested: ${requestedDays} day(s)`;
      }
    }
    
    return '';
  }, [form.start_date, form.end_date, requestedDays, monthsLimit, usedDaysThisMonth]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError('');
      const [reqs, types, pols] = await Promise.all([
        leaveRequestsService.list(),
        leaveTypesService.list(),
        leavePoliciesService.list(),
      ]);
      const list = Array.isArray(reqs) ? reqs : [];
      const filtered = isAdmin ? list : list.filter(r => String(r.employee_id) === String(user?.id));
      setItems(filtered);
      setLeaveTypes(Array.isArray(types) ? types : []);
      setPolicies(Array.isArray(pols) ? pols : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load leave requests or policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setSaving(false);
    setSuccess('');
    setError('');
    setEditingId(null);
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setSuccess('');
    setError('');

    if (!user?.id) {
      setError('User not available. Please re-login.');
      return;
    }

    // Validate required fields
    if (!form.leave_type_id) {
      setError('Please select a leave type');
      return;
    }
    
    if (!form.start_date) {
      setError('Please select a start date');
      return;
    }
    
    if (!form.end_date) {
      setError('Please select an end date');
      return;
    }

    // Validate half-day session
    if (form.is_half_day && !form.half_day_session) {
      setError('Please select Morning or Evening for half-day leave');
      return;
    }

    // Check date validation errors
    if (dateValidationError) {
      setError(dateValidationError);
      return;
    }

    try {
      setSaving(true);
      const payload = {
        employee_id: Number(user.id),
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        is_half_day: !!form.is_half_day,
        status: true,
        reason: form.reason?.trim() || '',
      };
      
      if (form.is_half_day) {
        payload.half_day_session = form.half_day_session;
      }
      
      if (editingId) {
        const updatePayload = {
          leave_type_id: Number(form.leave_type_id),
          start_date: payload.start_date,
          end_date: payload.end_date,
          is_half_day: payload.is_half_day,
          status: payload.status,
        };
        if (payload.half_day_session) {
          updatePayload.half_day_session = payload.half_day_session;
        }
        await leaveRequestsService.update(editingId, updatePayload);
        setSuccess('Leave request updated successfully');
      } else {
        await leaveRequestsService.create(payload);
        setSuccess('Leave request submitted successfully');
      }
      
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
    setForm({
      leave_type_id: row.leave_type_id || row.leaveType?.id || '',
      start_date: row.start_date?.slice(0,10) || '',
      end_date: row.end_date?.slice(0,10) || '',
      reason: row.reason || '',
      is_half_day: !!row.is_half_day,
      half_day_session: row.half_day_session || '',
    });
    setModalOpen(true);
  };

  // Get minimum date (today) for date inputs
  const minDate = toYMD(getTodayDate());

  const handleAdminDecision = async (row, decision) => {
    try {
      setSaving(true);
      await leaveRequestsService.update(row.id, { leave_status: decision, approved_by: user?.id });
      await fetchAll();
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to ${decision.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="apply-leave-wrap">
      <div className="designations-toolbar">
        <h2>{isAdmin ? 'Leave Requests' : 'Apply Leave'}</h2>
        {!isAdmin && (
          <div className="designations-actions">
            <button
              className="btn primary"
              onClick={() => {
                setEditingId(null);
                setForm(initialForm);
                setError('');
                setSuccess('');
                setModalOpen(true);
              }}
            >
              Apply Leave
            </button>
          </div>
        )}
      </div>

      {error && <div className="dep-alert error">{error}</div>}
      {success && <div className="dep-alert success">{success}</div>}

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Leave Request' : 'Apply Leave'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="al-form-grid">
                <div className="dep-field">
                  <label>Leave Type *</label>
                  <select
                    value={form.leave_type_id}
                    onChange={(e) => setForm((s) => ({ ...s, leave_type_id: e.target.value }))}
                    className="dep-input"
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="dep-field">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm((s) => ({ ...s, start_date: e.target.value }))}
                    className="dep-input"
                    min={minDate}
                    required
                  />
                </div>
                <div className="dep-field">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm((s) => ({ ...s, end_date: e.target.value }))}
                    className="dep-input"
                    min={form.start_date || minDate}
                    required
                  />
                </div>
                <div className="dep-field">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={!!form.is_half_day}
                      onChange={(e) => setForm((s) => ({ ...s, is_half_day: e.target.checked, half_day_session: '' }))}
                    />
                    <span>Half Day</span>
                  </label>
                </div>
                <div className="dep-field">
                  <label>Session {form.is_half_day && '*'}</label>
                  <select
                    className="dep-input"
                    value={form.half_day_session}
                    onChange={(e) => setForm((s) => ({ ...s, half_day_session: e.target.value }))}
                    disabled={!form.is_half_day}
                    required={!!form.is_half_day}
                  >
                    <option value="">Select</option>
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                  </select>
                </div>
                <div className="dep-field full-span">
                  <label>Reason</label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => setForm((s) => ({ ...s, reason: e.target.value }))}
                    className="dep-input"
                    rows={3}
                    placeholder="Optional"
                  ></textarea>
                </div>
              </div>
              
              {myPolicyForSelected && form.leave_type_id && (
                <div className="al-hint">
                  Monthly limit: <strong>{monthsLimit}</strong> day(s) | 
                  Used: <strong>{usedDaysThisMonth}</strong> day(s) | 
                  Available: <strong>{monthsLimit - usedDaysThisMonth}</strong> day(s) | 
                  Requesting: <strong>{requestedDays}</strong> day(s)
                </div>
              )}
              
              {dateValidationError && (
                <div className="al-hint error">{dateValidationError}</div>
              )}
              
              <div className="modal-actions">
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving || !!dateValidationError || !form.leave_type_id || !form.start_date || !form.end_date}
                >
                  {saving ? (editingId ? 'Updating...' : 'Submitting...') : (editingId ? 'Update Request' : 'Submit Request')}
                </button>
                <button type="button" className="btn ghost" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dep-table-card">
        <div className="dep-table-head">
          <span>{isAdmin ? 'All Requests' : 'My Requests'}: {items.length}</span>
          <button className="btn refresh" onClick={fetchAll} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <div className="dep-table-wrap">
          <table className="dep-table">
            <thead>
              <tr>
                <th style={{width:'60px'}}>ID</th>
                {isAdmin && <th>Employee</th>}
                <th>Leave Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Half Day</th>
                <th>Session</th>
                <th>Status</th>
                <th style={{width:'120px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 9 : 8} className="center">Loading...</td></tr>
              ) : items.length ? (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    {isAdmin && (
                      <td>{row.employee?.name || `Emp #${row.employee_id}`}</td>
                    )}
                    <td>{row.leaveType?.name || row.leave_type?.name || '-'}</td>
                    <td>{formatDateDMY(row.start_date)}</td>
                    <td>{formatDateDMY(row.end_date)}</td>
                    <td>{row.is_half_day ? 'Yes' : 'No'}</td>
                    <td>{row.half_day_session || '-'}</td>
                    <td>
                      <span className={`badge ${row.leave_status === 'Approved' ? 'success' : row.leave_status === 'Rejected' ? 'danger' : 'muted'}`}>
                        {row.leave_status || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {!isAdmin && (
                          <button
                            className="btn small"
                            onClick={() => handleEdit(row)}
                            disabled={row.leave_status !== 'Pending'}
                            title={row.leave_status !== 'Pending' ? 'Only pending requests can be edited' : 'Edit request'}
                          >
                            Edit
                          </button>
                        )}
                        {isAdmin && row.leave_status === 'Pending' && (
                          <>
                            <button className="btn small" onClick={() => handleAdminDecision(row, 'Approved')} disabled={saving}>Approve</button>
                            <button className="btn small ghost" onClick={() => handleAdminDecision(row, 'Rejected')} disabled={saving}>Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={isAdmin ? 9 : 8} className="center">No requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default ApplyLeave;