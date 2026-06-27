// src/services/fileService.js
import api from './apiClient';

export const fileService = {
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file); // 'file' phải trùng với tên biến @RequestParam bên Backend

        const res = await api.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        // Backend trả về: { data: { coverKey: "images/microservices-pattern.png" } }
        return res.data?.data || res.data;
    }
};