// src/services/fileService.js
import api from './apiClient';

export const fileService = {
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await api.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return res.data?.data || res.data;
    }
};
