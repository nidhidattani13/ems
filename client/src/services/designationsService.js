import api from './api';

export const designationsService = {
  list: async () => {
    const res = await api.get('/designations');
    return res.data?.data || [];
  },
  listByDepartment: async (department_id) => {
    const res = await api.get(`/designations/department/${department_id}`);
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/designations/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/designations', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/designations/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/designations/${id}`);
    return res.data;
  },
};
