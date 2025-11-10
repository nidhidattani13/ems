import api from './api';

export const leavePoliciesService = {
  list: async () => {
    const res = await api.get('/leave-policies');
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/leave-policies/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/leave-policies', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/leave-policies/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/leave-policies/${id}`);
    return res.data;
  },
};
