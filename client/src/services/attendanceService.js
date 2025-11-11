import api from './api';

export const attendanceService = {
  signIn: async (location, photo) => {
    // location and photo: optional
    const payload = {};
    if (location) payload.location = location;
    if (photo) payload.photo = photo;
    const res = await api.post('/attendance/sign-in', payload);
    return res.data?.data || null;
  },
  signOut: async (location, photo) => {
    const payload = {};
    if (location) payload.location = location;
    if (photo) payload.photo = photo;
    const res = await api.post('/attendance/sign-out', payload);
    return res.data?.data || null;
  },
  // Fix others too
  listMine: async () => {
    const res = await api.get('/attendance/my');
    return res.data?.data || [];
  },
  getToday: async () => {
    const res = await api.get('/attendance/my/today');
    return res.data?.data || null;
  },
  listAll: async (params = {}) => {
    const search = new URLSearchParams();
    if (params.month) search.set('month', String(params.month));
    if (params.year) search.set('year', String(params.year));
    const qs = search.toString();
    const url = `/attendance${qs ? `?${qs}` : ''}`;
    const res = await api.get(url);
    return res.data?.data || [];
  },
};
