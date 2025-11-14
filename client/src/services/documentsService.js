import api from './api';

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export const documentsService = {
  upload: async (employeeId, file, type) => {
    // file is a File object
    const dataUrl = typeof file === 'string' ? file : await toBase64(file);
    const payload = { file: dataUrl, type, filename: file.name || '' };
    const res = await api.post(`/employees/${employeeId}/documents`, payload);
    return res.data?.data;
  },
  remove: async (employeeId, docId) => {
    const res = await api.delete(`/employees/${employeeId}/documents/${docId}`);
    return res.data;
  },
  get: async (employeeId, docId) => {
    const res = await api.get(`/employees/${employeeId}/documents/${docId}`);
    return res.data?.data || null; // returns { status, data, filename, mime }
  },
  update: async (employeeId, docId, { file, type, filename }) => {
    // file may be a File object; convert to base64 if needed
    let payload = { type, filename };
    if (file) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // strip data: prefix and keep base64 body if server expects raw base64 OR send full data URL
      // our server accepts data URL as-is; send the full string
      payload.file = dataUrl.startsWith('data:') ? dataUrl : dataUrl;
    }
    const res = await api.put(`/employees/${employeeId}/documents/${docId}`, payload);
    return res.data?.data;
  },
};

export default documentsService;
