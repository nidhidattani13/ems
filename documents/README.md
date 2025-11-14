Documents Template

This directory contains a reusable Documents tab template component:

- `DocumentsTemplate.jsx` — React component that provides a self-contained upload/preview/add/delete UI and basic client-side validation.
- `styles.css` — small CSS file to style the template.

Usage:

1. Copy this directory or import the component directly into another project.
2. Provide `onSave(fileInfo)` and `onDelete(docId)` callbacks to integrate with your backend/storage.
3. `initialDocs` prop accepts an array of existing document objects: { id, type, url, uploadedAt }.

Notes:
- The template is intentionally minimal — it does not include image compression. If you need compression, add a helper before calling `onSave`.
- Spinner is used from the main project at `src/components/Spinner.jsx`. If importing into another project, replace or reimplement a small spinner component.
