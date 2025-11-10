import api from './api';

export const leaveRequestsService = {
  list: async () => {
    const res = await api.get('/leave-requests');
    return res.data?.data || [];
  },
  teamList: async () => {
    const res = await api.get('/leave-requests/team');
    return res.data?.data || [];
  },
  get: async (id) => {
    const res = await api.get(`/leave-requests/${id}`);
    return res.data?.data;
  },
  create: async (payload) => {
    const res = await api.post('/leave-requests', payload);
    return res.data?.data;
  },
  update: async (id, payload) => {
    const res = await api.put(`/leave-requests/${id}`, payload);
    return res.data?.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/leave-requests/${id}`);
    return res.data;
  },
};
