import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';

export default function AdminAddBookPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Tải danh mục để hiển thị trong <select>
        bookService.getCategories()
            .then(setCategories)
            .catch((err) => console.error("Lỗi load danh mục:", err))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            // Payload phải gửi đầy đủ các trường mà API POST /api/v1/books yêu cầu
            const payload = {
                title: data.title,
                author: data.author,
                price: Number(data.price),
                stock: Number(data.stock),
                categoryId: Number(data.categoryId), // Trường bắt buộc từ Swagger
                description: data.description || "",
                isbn: data.isbn || "N/A",
                publisher: data.publisher || "N/A",
                publicationYear: Number(data.publicationYear) || 2026,
                language: data.language || "vi",
                active: true
            };

            await adminService.addBook(payload);
            alert("Thêm sách thành công!");
            navigate('/admin/books');
        } catch (err) {
            // Hiển thị lỗi từ server nếu xảy ra 400 Validation Error
            const errorMsg = err.response?.data?.message || err.message;
            alert("Lỗi thêm sách: " + errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p>Đang tải dữ liệu...</p>;

    return (
        <section className="narrow">
            <h1>Thêm sách mới</h1>
            <form className="form" onSubmit={handleSubmit}>
                <Input name="title" label="Tên sách" required />
                <Input name="author" label="Tác giả" required />

                {/* Ô chọn danh mục - PHẢI CÓ để tránh lỗi 400 */}
                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Thể loại</label>
                    <select name="categoryId" required style={{ width: '100%', padding: '10px' }}>
                        <option value="" disabled selected>-- Chọn thể loại --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <Input name="price" label="Giá" type="number" required />
                    <Input name="stock" label="Số lượng" type="number" required />
                </div>

                <Input name="isbn" label="Mã ISBN" />
                <Textarea name="description" label="Mô tả" rows={5} />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button type="button" onClick={() => navigate('/admin/books')}>Hủy</Button>
                    <Button type="submit" variant="primary" loading={submitting}>Lưu sách</Button>
                </div>
            </form>
        </section>
    );
}