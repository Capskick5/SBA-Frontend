import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1/payment', // Hoặc theo đường dẫn thực tế của bạn
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export const paymentService = {
    // Kiểm tra kết quả thanh toán
    verifyPayment: async (params) => {
        // params có thể chứa các thông tin VNPAY trả về như vnp_ResponseCode
        const response = await api.get('/result', { params });
        return response.data;
    }
};