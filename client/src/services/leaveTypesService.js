import api from './api';

export const leaveTypesService = {
  list: async () => {
    const res = await api.get('/leave-types');
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/leave-types/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/leave-types', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/leave-types/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/leave-types/${id}`);
    return res.data;
  },
};
