import api from './api';

export const departmentsService = {
  list: async () => {
    const res = await api.get('/departments');
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/departments/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/departments', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/departments/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/departments/${id}`);
    return res.data;
  },
};
