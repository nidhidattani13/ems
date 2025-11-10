import api from './api';

export const employeesService = {
  list: async () => {
    const res = await api.get('/employees');
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/employees', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/employees/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/employees/${id}`);
    return res.data;
  },
  updateSelf: async (payload) => {
    const res = await api.put('/employees/me', payload);
    return res.data?.data;
  },
};
