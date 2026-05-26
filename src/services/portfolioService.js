import apiClient from './apiClient';

export const getPortfolio = async () => {
  const { data } = await apiClient.get('/client/portfolio');
  return data.portfolio ?? [];
};

export const getProfit = async () => {
  const { data } = await apiClient.get('/client/portfolio/profit');
  return data.totalProfit ?? 0;
};

export const setPublicMode = async (ticker, isPublic) => {
  const { data } = await apiClient.put(`/client/portfolio/${ticker}/public-mode`, { isPublic });
  return data;
};
