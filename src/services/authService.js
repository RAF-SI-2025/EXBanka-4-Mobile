import apiClient from './apiClient';
import * as SecureStore from 'expo-secure-store';

export const login = async (email, password) => {
  const { data } = await apiClient.post('/client/login', { email, password, source: 'mobile' });
  return data; // { access_token, refresh_token }
};

export const logout = async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch {}
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
};

export const getMe = async () => {
  const { data } = await apiClient.get('/client/me');
  return data;
};

export const forgotPassword = async (email) => {
  await apiClient.post('/auth/forgot-password', { email });
};

export const resetPassword = async (token, password, confirmPassword) => {
  await apiClient.post('/auth/reset-password', {
    token,
    password,
    confirm_password: confirmPassword,
  });
};
