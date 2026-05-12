import apiClient from './apiClient';

export const getOTCMarket = async () => {
  const { data } = await apiClient.get('/otc/market');
  return data;
};

export const getMyNegotiations = async () => {
  const { data } = await apiClient.get('/otc/negotiations');
  return data;
};

export const getNegotiation = async (id) => {
  const { data } = await apiClient.get(`/otc/negotiations/${id}`);
  return data;
};

export const createNegotiation = async (payload) => {
  const { data } = await apiClient.post('/otc/negotiations', payload);
  return data;
};

export const counterOffer = async (id, payload) => {
  const { data } = await apiClient.put(`/otc/negotiations/${id}/counter`, payload);
  return data;
};

export const acceptNegotiation = async (id, buyerAccountId) => {
  const { data } = await apiClient.put(`/otc/negotiations/${id}/accept`, { buyerAccountId });
  return data;
};

export const rejectNegotiation = async (id) => {
  const { data } = await apiClient.put(`/otc/negotiations/${id}/reject`);
  return data;
};

export const getMyContracts = async (statusFilter) => {
  const params = statusFilter ? { status: statusFilter } : {};
  const { data } = await apiClient.get('/otc/contracts', { params });
  return data;
};

export const exerciseContract = async (id, buyerAccountId) => {
  const { data } = await apiClient.post(`/otc/contracts/${id}/exercise`, { buyerAccountId });
  return data;
};
