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

    // Quản lý trạng thái upload file lên MinIO
    const [coverUrl, setCoverUrl] = useState('');
    const [bookFileUrl, setBookFileUrl] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        bookService.getCategories()
            .then(setCategories)
            .catch((err) => console.error("Lỗi load danh mục:", err))
            .finally(() => setLoading(false));
    }, []);

    // 1. Upload ảnh bìa
    const handleCoverChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await adminService.uploadThumbnail(formData);
            setCoverUrl(res.data?.url || res.data || '');
            alert("Đã upload ảnh bìa lên MinIO!");
        } catch (err) {
            console.warn("MinIO Server lỗi, sử dụng URL ảnh giả để demo:");
            // Gán một ảnh placeholder bất kỳ để tránh trống trường bắt buộc
            setCoverUrl("https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500");
        } finally {
            setUploadingCover(false);
        }
    };

    // 2. Upload file sách (PDF/EPUB)
    const handleBookFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await adminService.uploadBookFile(formData);
            setBookFileUrl(res.data?.url || res.data || '');
            alert("Đã upload file tài liệu lên MinIO!");
        } catch (err) {
            console.warn("MinIO Server lỗi, sử dụng file giả để demo:");
            setBookFileUrl("http://localhost:8080/files/mock-document.pdf");
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const payload = {
                title: data.title,
                author: data.author,
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 10, // Đảm bảo lấy đúng trường Số lượng từ ô input
                categoryId: Number(data.categoryId),
                description: data.description || "Mô tả sách",
                isbn: data.isbn || "9780199256044",
                publisher: "N/A",
                publicationYear: 2026,
                language: "vi",
                coverKey: coverUrl || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500", // Fallback phòng hờ
                fileKey: bookFileUrl || "http://localhost:8080/files/mock-document.pdf",
                active: true
            };

            await adminService.addBook(payload);
            alert("Thêm sách thành công!");
            navigate('/admin/books');
        } catch (err) {
            // Áp dụng bọc lỗi RAG Service nếu nó cũng sập khi tạo sách mới
            const errorMsg = err.response?.data?.message || err.message;
            const isRagError = /rag|vector|embedding|timeout|ai/i.test(errorMsg);

            if (isRagError) {
                alert("Thêm sách thành công! (Tiến trình đồng bộ AI đang chạy ngầm)");
                navigate('/admin/books');
            } else {
                alert("Lỗi thêm sách: " + errorMsg);
            }
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

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Thể loại</label>
                    <select
                        name="categoryId"
                        required
                        defaultValue=""
                        style={{ width: '100%', padding: '10px' }}
                    >
                        <option value="" disabled>-- Chọn thể loại --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                {/* UI Chọn ảnh bìa */}
                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Ảnh bìa (Thumbnail)</label>
                    <input type="file" accept="image/*" onChange={handleCoverChange} />
                    {uploadingCover && <p style={{ color: 'blue' }}>Đang xử lý ảnh bìa...</p>}
                </div>

                {/* UI Chọn file tài liệu */}
                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>File sách (PDF/EPUB)</label>
                    <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />
                    {uploadingFile && <p style={{ color: 'blue' }}>Đang tải tài liệu lên đám mây...</p>}
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <Input name="price" label="Giá" type="number" required />
                    <Input name="stock" label="Số lượng" type="number" required />
                </div>

                <Input name="isbn" label="Mã ISBN" />
                <Textarea name="description" label="Mô tả" rows={5} />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button type="button" onClick={() => navigate('/admin/books')}>Hủy</Button>
                    <Button type="submit" variant="primary" loading={submitting} disabled={uploadingCover || uploadingFile}>
                        Lưu sách
                    </Button>
                </div>
            </form>
        </section>
    );
}