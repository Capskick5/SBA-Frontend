import { mapAddressFromApi, mapAddressToApi } from '../utils/addressMapper';
import { apiClient } from './apiClient';

export const addressService = {
  async list() {
    const data = await apiClient.get('/users/me/addresses');
    return (data || []).map(mapAddressFromApi);
  },

  async create(payload) {
    const data = await apiClient.post('/users/me/addresses', mapAddressToApi(payload));
    return mapAddressFromApi(data);
  },

  async update(id, payload) {
    const data = await apiClient.put(`/users/me/addresses/${id}`, mapAddressToApi(payload));
    return mapAddressFromApi(data);
  },

  async remove(id) {
    await apiClient.delete(`/users/me/addresses/${id}`);
  },

  async setDefault(id) {
    const data = await apiClient.put(`/users/me/addresses/${id}/default`);
    return mapAddressFromApi(data);
  },
};
