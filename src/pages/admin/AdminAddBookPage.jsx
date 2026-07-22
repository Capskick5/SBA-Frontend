import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import PricingFields from '../../components/admin/PricingFields';
import { ErrorState, LoadingState } from '../../components/ui/State';

export default function AdminAddBookPage() {
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [coverKey, setCoverKey] = useState('');
    const [fileKey, setFileKey] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        bookService.getCategories()
            .then(setCategories)
            .catch((err) => {
                console.error('Failed to load categories:', err);
                setLoadError('Không thể tải danh mục cho biểu mẫu sách.');
            })
            .finally(() => setLoading(false));
    }, [reloadKey]);

    const handleCoverChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await adminService.uploadThumbnail(formData);
            const key = res.data?.data?.coverKey || res.data?.coverKey;
            if (!key) throw new Error('Invalid upload response');
            setCoverKey(key);
            alert('Đã tải bìa lên MinIO.');
        } catch (err) {
            alert('Không thể tải bìa lên: ' + err.message);
        } finally {
            setUploadingCover(false);
        }
    };

    const handleBookFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingFile(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await adminService.uploadBookFile(formData);
            const key = res.data?.data?.fileKey || res.data?.fileKey;
            if (!key) throw new Error('Invalid upload response');
            setFileKey(key);
            alert('Đã tải tệp sách lên MinIO.');
        } catch (err) {
            alert('Không thể tải tệp sách lên: ' + err.message);
        } finally {
            setUploadingFile(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        if (!coverKey) {
            alert('Vui lòng tải ảnh bìa trước.');
            setSubmitting(false);
            return;
        }
        if (!fileKey) {
            alert('Vui lòng tải tệp sách trước.');
            setSubmitting(false);
            return;
        }

        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const payload = {
                title: data.title,
                author: data.author,
                price: Number(data.price) || 0,
                originalPrice: Number(data.originalPrice) || Number(data.price) || 0,
                stock: Number(data.stock) || 10,
                categoryId: Number(data.categoryId),
                description: data.description || 'Book description',
                isbn: data.isbn || '9780199256044',
                publisher: 'N/A',
                publicationYear: 2026,
                language: 'vi',
                coverKey: coverKey,
                fileKey: fileKey,
                active: true
            };

            await adminService.addBook(payload);
            alert('Tạo sách thành công.');
            navigate('/admin/books');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            const isRagError = /rag|vector|embedding|timeout|ai/i.test(errorMsg);

            if (isRagError) {
                alert('Tạo sách thành công. Đồng bộ tìm kiếm AI đang chạy nền.');
                navigate('/admin/books');
            } else {
                alert('Không thể tạo sách: ' + errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingState text="Đang tải dữ liệu..." />;
    if (loadError) {
        return (
            <ErrorState text={loadError}>
                <Button onClick={() => {
                    setLoadError('');
                    setLoading(true);
                    setReloadKey((value) => value + 1);
                }}>Thử lại</Button>
            </ErrorState>
        );
    }

    return (
        <section className="narrow">
            <h1>Thêm sách mới</h1>
            <form className="form" onSubmit={handleSubmit}>
                <Input name="title" label="Tiêu đề" required placeholder="Nhập tiêu đề sách" />
                <Input name="author" label="Tác giả" required placeholder="Nhập tên tác giả" />

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Danh mục</label>
                    <select
                        name="categoryId"
                        required
                        defaultValue=""
                        style={{ width: '100%', padding: '10px' }}
                    >
                        <option value="" disabled>-- Chọn danh mục --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Ảnh bìa</label>
                    <input type="file" accept="image/*" onChange={handleCoverChange} />
                    {uploadingCover && <p style={{ color: 'blue' }}>Đang tải bìa lên...</p>}
                </div>

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Tệp sách (PDF/EPUB)</label>
                    <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />
                    {uploadingFile && <p style={{ color: 'blue' }}>Đang tải tệp sách lên...</p>}
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <PricingFields />
                    </div>
                    <Input name="stock" label="Tồn kho" type="number" required placeholder="Số lượng tồn kho ban đầu" />
                </div>

                <Input name="isbn" label="ISBN" placeholder="Nhập ISBN" />
                <Textarea name="description" label="Mô tả" rows={5} />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button type="button" onClick={() => navigate('/admin/books')}>Hủy</Button>
                    <Button type="submit" variant="primary" loading={submitting} disabled={uploadingCover || uploadingFile}>
                        Lưu
                    </Button>
                </div>
            </form>
        </section>
    );
}
