import React, { useState } from 'react';
import Spinner from '../../components/Spinner';
import './styles.css';

// DocumentsTemplate
// - Lightweight, self-contained template to reuse the Documents tab UI + logic in another project.
// Props:
// - initialDocs: array of { id, type, url, uploadedAt }
// - allowedTypes: array of strings (e.g. ['Aadhaar', 'Photo', 'Certificate'])
// - onSave: async function(pendingDoc) -> result
// - onDelete: async function(docId)

export default function DocumentsTemplate({ initialDocs = [], allowedTypes = ['Photo', 'Aadhaar', 'Certificate'], onSave = async () => {}, onDelete = async () => {} }) {
  const [docs, setDocs] = useState(initialDocs || []);
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingType, setPendingType] = useState(allowedTypes[0] || '');
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Basic client-side type check (image/pdf)
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Only images or PDF files are supported.');
      return;
    }
    setError('');
    setPendingFile(f);
    // quick preview for images
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
    setError('');
    setIsSaving(true);
    try {
      // onSave expected to upload or persist; receive a File and a type
      const res = await onSave({ file: pendingFile, type: pendingType });
      // Allow caller to return { id, type, url, uploadedAt }
      if (res && res.id) {
        setDocs(prev => [{ id: res.id, type: res.type || pendingType, url: res.url || '', uploadedAt: res.uploadedAt || new Date().toISOString() }, ...prev]);
      } else {
        // fallback: create a local entry
        const id = `local-${Date.now()}`;
        const url = previewUrl || '';
        setDocs(prev => [{ id, type: pendingType, url, uploadedAt: new Date().toISOString() }, ...prev]);
      }
      setPendingFile(null);
      setPreviewUrl('');
    } catch (e) {
      console.error('DocumentsTemplate add error', e);
      setError('Failed to add document');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await onDelete(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error('Delete error', e);
      setError('Failed to delete document');
    }
  };

  return (
    <div className="tmpl-docs-root">
      <div className="tmpl-docs-form">
        <label className="tmpl-label">Document Type</label>
        <select value={pendingType} onChange={(e) => setPendingType(e.target.value)} className="tmpl-select">
          {allowedTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

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
            {docs.map(d => (
              <li key={d.id} className="tmpl-doc-item">
                <div className="tmpl-doc-meta">
                  <div className="tmpl-doc-type">{d.type}</div>
                  <div className="tmpl-doc-date">{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</div>
                </div>
                <div className="tmpl-doc-actions">
                  {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="tmpl-link">View</a> : null}
                  <button className="tmpl-btn-delete" onClick={() => handleDelete(d.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
