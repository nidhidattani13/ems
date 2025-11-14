import React, { useEffect, useState } from 'react';
import Spinner from './Spinner';
import { documentsService } from '../services/documentsService';
import '../styles/Documents.css';

export default function DocumentsManager({ employeeId, initialDocs = [], allowedTypes = ['None','Aadhaar Card','Others'] }) {
  const normalize = (arr) => (Array.isArray(arr) ? arr.map(d => ({
    id: d.id,
    type: d.type,
    filename: d.filename || d.name || '',
    // prefer explicit url, then data (server returns `data`), fall back to raw
    data: d.url || d.data || d.dataUrl || d,
    uploadedAt: d.uploadedAt || d.createdAt || d.created_at || null,
  })) : []);

  const [docs, setDocs] = useState(normalize(initialDocs));
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingType, setPendingType] = useState('None');
  const [customType, setCustomType] = useState('');
  const [editDoc, setEditDoc] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setDocs(normalize(initialDocs)); }, [initialDocs]);

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only images or PDF files are supported.');
      return;
    }
    setError('');
    setPendingFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreviewUrl(reader.result || '');
      reader.readAsDataURL(f);
    } else {
      setPreviewUrl('');
    }
  };

  const handleAdd = async () => {
    if (!pendingFile) { setError('Please select a file'); return; }
    setIsSaving(true);
    setError('');
    try {
      // determine effective type
      let effType = pendingType;
      if (String(pendingType).toLowerCase() === 'others' || String(pendingType).toLowerCase() === 'other') {
        if (!customType?.trim()) { setError('Please enter document name for Others'); setIsSaving(false); return; }
        effType = customType.trim().toUpperCase();
      } else if (String(effType).toLowerCase() !== 'none') {
        effType = String(effType).trim().toUpperCase();
      } else {
        // none selected
        effType = '';
      }

      const created = await documentsService.upload(employeeId, pendingFile, effType);
      if (created) {
        // created = { id, type, filename, data, uploadedAt }
        const item = { id: created.id, type: created.type || effType, filename: created.filename || '', data: created.data || '', uploadedAt: created.uploadedAt || new Date().toISOString() };
        setDocs(prev => [item, ...prev]);
      }
      setPendingFile(null);
      setPreviewUrl('');
    } catch (e) {
      console.error('Add doc error', e);
      setError(e?.response?.data?.message || 'Failed to add document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditOpen = (doc) => {
    setEditDoc({ ...doc, newFile: null, editType: doc.type || '' });
  };

  const handleEditSave = async () => {
    if (!editDoc) return;
    try {
      setIsSaving(true);
      let typeToSend = editDoc.editType;
      if (String(typeToSend).toLowerCase() === 'others' || String(typeToSend).toLowerCase() === 'other') {
        // if user typed custom in editType field, ensure uppercase
        if (!editDoc.customType || !editDoc.customType.trim()) { setError('Please enter custom document name'); setIsSaving(false); return; }
        typeToSend = editDoc.customType.trim().toUpperCase();
      } else if (String(typeToSend).toLowerCase() !== 'none') {
        typeToSend = String(typeToSend).trim().toUpperCase();
      } else {
        typeToSend = '';
      }

      const payload = { type: typeToSend, filename: editDoc.filename };
      if (editDoc.newFile) payload.file = editDoc.newFile;
      const updated = await documentsService.update(employeeId, editDoc.id, payload);
      if (updated) {
        setDocs(prev => prev.map(d => d.id === editDoc.id ? { id: updated.id, type: updated.type || typeToSend, filename: updated.filename || d.filename, data: updated.data || d.data, uploadedAt: updated.uploadedAt || d.uploadedAt } : d));
      }
      setEditDoc(null);
    } catch (e) {
      console.error('Edit save error', e);
      setError(e?.response?.data?.message || 'Failed to update document');
    } finally { setIsSaving(false); }
  };

  const handleEditCancel = () => setEditDoc(null);

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsService.remove(employeeId, docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error('delete doc error', e);
      setError(e?.response?.data?.message || 'Failed to delete document');
    }
  };

  const viewDoc = async (doc) => {
    try {
      setError('');
      // fetch via authenticated API to ensure token is used
      const res = await documentsService.get(employeeId, doc.id);
      if (!res) { setError('Failed to load document'); return; }
      const dataUrl = res.data || res; // service returns either data object or string
      // create blob and open in new tab to avoid direct data: URL issues
      const fetched = await fetch(dataUrl);
      const blob = await fetched.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // optional: revoke after some time
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error('view doc error', e);
      setError(e?.response?.data?.message || 'Unable to open document');
    }
  };

  return (<>
    <div className="tmpl-docs-root">
      <div className="tmpl-docs-form">
        <label className="tmpl-label">Document Type</label>
        <select value={pendingType} onChange={(e) => setPendingType(e.target.value)} className="tmpl-select">
          {allowedTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {String(pendingType).toLowerCase() === 'others' && (
          <div style={{ marginTop: 8 }}>
            <label className="tmpl-label">Custom document name</label>
            <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Enter document name" className="tmpl-select" />
          </div>
        )}

        <label className="tmpl-label">Choose file</label>
        <input type="file" onChange={handleFileChange} className="tmpl-file-input" />

        {previewUrl ? (
          <div className="tmpl-preview">
            <img src={previewUrl} alt="preview" style={{ maxWidth: '160px', maxHeight: '160px' }} />
            <div className="tmpl-preview-note">Preview (image)</div>
          </div>
        ) : null}

        {error && <div className="tmpl-error">{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="tmpl-btn-primary" onClick={handleAdd} disabled={isSaving}>{isSaving ? <Spinner size={20} label="Saving" /> : 'Add Document'}</button>
          <button className="tmpl-btn-secondary" onClick={() => { setPendingFile(null); setPreviewUrl(''); setError(''); }}>Cancel</button>
        </div>
      </div>

      <div className="tmpl-docs-list">
        <h4>Uploaded documents</h4>
        {docs.length === 0 ? <div className="tmpl-empty">No documents added yet.</div> : (
          <ul className="tmpl-docs-ul">
            {docs.map(d => {
              const src = d.data || d.url || '';
              return (
                <li key={d.id} className="tmpl-doc-item">
                  <div className="tmpl-doc-meta">
                    <div className="tmpl-doc-type">{d.type}</div>
                    <div className="tmpl-doc-date">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</div>
                  </div>
                  <div className="tmpl-doc-actions">
                    {src ? <button className="tmpl-link" onClick={() => viewDoc(d)}>View</button> : null}
                    <button className="tmpl-btn-delete" onClick={() => handleDelete(d.id)}>Delete</button>
                    <button className="tmpl-btn-edit" onClick={() => handleEditOpen(d)}>Edit</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
    {editDoc ? (
      <div className="tmpl-edit-modal" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 8, width: 520 }}>
          <h4>Edit document</h4>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>Type</label>
            <select value={editDoc.editType} onChange={(e) => setEditDoc(s => ({ ...s, editType: e.target.value }))} className="tmpl-select">
              {allowedTypes.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="Others">Others</option>
            </select>
            {String(editDoc.editType).toLowerCase() === 'others' && (
              <input type="text" placeholder="Custom document name" value={editDoc.customType || ''} onChange={(e) => setEditDoc(s => ({ ...s, customType: e.target.value }))} className="tmpl-select" />
            )}

            <label>Filename</label>
            <input type="text" value={editDoc.filename || ''} onChange={(e) => setEditDoc(s => ({ ...s, filename: e.target.value }))} className="tmpl-select" />

            <label>Replace file (optional)</label>
            <input type="file" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setEditDoc(s => ({ ...s, newFile: f })); }} className="tmpl-select" />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="tmpl-btn-primary" onClick={handleEditSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</button>
              <button className="tmpl-btn-secondary" onClick={handleEditCancel}>Cancel</button>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}
