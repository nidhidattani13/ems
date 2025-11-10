import api from './api';

export const employeeService = {
  getById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data?.data || null;
  },
};
