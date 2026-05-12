import apiClient from './apiClient';

export const listFunds = async () => {
  const { data } = await apiClient.get('/investment/funds');
  return data;
};

export const getFund = async (id) => {
  const { data } = await apiClient.get(`/investment/funds/${id}`);
  return data;
};

export const getMyFundPositions = async () => {
  const { data } = await apiClient.get('/client/funds/positions');
  return data;
};

export const investInFund = async (fundId, sourceAccountId, amount) => {
  const { data } = await apiClient.post(`/investment/funds/${fundId}/invest`, {
    sourceAccountId,
    amount,
  });
  return data;
};

export const withdrawFromFund = async (fundId, destinationAccountId, amount, withdrawAll = false) => {
  const { data } = await apiClient.post(`/investment/funds/${fundId}/withdraw`, {
    destinationAccountId,
    amount,
    withdrawAll,
  });
  return data;
};

