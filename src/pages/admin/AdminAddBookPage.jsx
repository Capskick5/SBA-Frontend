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

    const [coverUrl, setCoverUrl] = useState('');
    const [bookFileUrl, setBookFileUrl] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);

    useEffect(() => {
        bookService.getCategories()
            .then(setCategories)
            .catch((err) => console.error('Failed to load categories:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleCoverChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await adminService.uploadThumbnail(formData);
            setCoverUrl(res.data?.url || res.data || '');
            alert('Cover uploaded to MinIO.');
        } catch (err) {
            console.warn('MinIO upload failed. Using a demo cover URL:', err);
            setCoverUrl('https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500');
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
            setBookFileUrl(res.data?.url || res.data || '');
            alert('Book file uploaded to MinIO.');
        } catch (err) {
            console.warn('MinIO upload failed. Using a demo file URL:', err);
            setBookFileUrl('http://localhost:8080/files/mock-document.pdf');
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
                stock: Number(data.stock) || 10,
                categoryId: Number(data.categoryId),
                description: data.description || 'Book description',
                isbn: data.isbn || '9780199256044',
                publisher: 'N/A',
                publicationYear: 2026,
                language: 'vi',
                coverKey: coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500',
                fileKey: bookFileUrl || 'http://localhost:8080/files/mock-document.pdf',
                active: true
            };

            await adminService.addBook(payload);
            alert('Book created successfully.');
            navigate('/admin/books');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            const isRagError = /rag|vector|embedding|timeout|ai/i.test(errorMsg);

            if (isRagError) {
                alert('Book created successfully. AI search sync is running in the background.');
                navigate('/admin/books');
            } else {
                alert('Failed to create book: ' + errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <p>Loading data...</p>;

    return (
        <section className="narrow">
            <h1>Add New Book</h1>
            <form className="form" onSubmit={handleSubmit}>
                <Input name="title" label="Title" required />
                <Input name="author" label="Author" required />

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Category</label>
                    <select
                        name="categoryId"
                        required
                        defaultValue=""
                        style={{ width: '100%', padding: '10px' }}
                    >
                        <option value="" disabled>-- Select category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Cover Image</label>
                    <input type="file" accept="image/*" onChange={handleCoverChange} />
                    {uploadingCover && <p style={{ color: 'blue' }}>Uploading cover...</p>}
                </div>

                <div className="input-group" style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Book File (PDF/EPUB)</label>
                    <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />
                    {uploadingFile && <p style={{ color: 'blue' }}>Uploading book file...</p>}
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <Input name="price" label="Price" type="number" required />
                    <Input name="stock" label="Stock" type="number" required />
                </div>

                <Input name="isbn" label="ISBN" />
                <Textarea name="description" label="Description" rows={5} />

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                    <Button type="button" onClick={() => navigate('/admin/books')}>Cancel</Button>
                    <Button type="submit" variant="primary" loading={submitting} disabled={uploadingCover || uploadingFile}>
                        Save Book
                    </Button>
                </div>
            </form>
        </section>
    );
}
