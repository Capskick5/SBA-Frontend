import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';

export default function AdminBookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [coverUrl, setCoverUrl] = useState('');
  const [bookFileUrl, setBookFileUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    Promise.all([
      bookService.getCategories(),
      adminService.getBookById(id),
    ])
      .then(([categoryList, bookData]) => {
        setCategories(categoryList || []);
        const actualBook = bookData.data || bookData;
        setBook(actualBook);

        setCoverUrl(actualBook.coverUrl || '');
        setBookFileUrl(actualBook.bookFileUrl || actualBook.fileUrl || '');
      })
      .catch((err) => {
        console.error('Failed to load book detail:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminService.uploadThumbnail(formData);
      const resData = res.data || res;
      setCoverUrl(resData.url || resData.coverUrl || resData);
      alert('Cover uploaded to MinIO.');
    } catch (err) {
      alert('Failed to upload cover: ' + err.message);
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
      const resData = res.data || res;
      setBookFileUrl(resData.url || resData.bookFileUrl || resData.fileUrl || resData);
      alert('Book file uploaded to MinIO.');
    } catch (err) {
      alert('Failed to upload book file: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(event.target);
      const values = Object.fromEntries(formData.entries());

      const payload = {
        title: values.title,
        author: values.author,
        isbn: values.isbn || null,
        publisher: values.publisher || null,
        publicationYear: values.publicationYear ? Number(values.publicationYear) : null,
        language: values.language || book.language || 'vi',
        pages: values.pages ? Number(values.pages) : null,
        categoryId: Number(values.categoryId),
        price: Number(values.price),
        originalPrice: values.originalPrice ? Number(values.originalPrice) : Number(values.price),
        description: values.description || '',

        coverUrl: coverUrl || book.coverUrl,
        bookFileUrl: bookFileUrl || book.bookFileUrl || book.fileUrl || '',

        fileKey: book.fileKey,
        coverKey: book.coverKey,
        active: book.active ?? true,
      };

      await adminService.updateBook(id, payload);
      alert('Book updated successfully.');
      navigate('/admin/books');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;

      const isRagError = /rag|ingest|vector|index|embedding|timeout|ai/i.test(errorMsg);

      if (isRagError) {
        console.warn('RAG sync failed after the core book update:', errorMsg);
        alert('Book updated successfully. AI search sync is running in the background.');
        navigate('/admin/books');
      } else {
        alert(`Failed to update book: ${errorMsg}`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!book) return <p>Book not found.</p>;

  return (
    <section className="narrow">
      <h1>Edit Book: #{id}</h1>
      <form className="form" onSubmit={handleSave}>
        <Input name="title" label="Title" defaultValue={book.title} required />
        <Input name="author" label="Author" defaultValue={book.author} required />
        <Input name="isbn" label="ISBN" defaultValue={book.isbn || ''} />
        <Input name="publisher" label="Publisher" defaultValue={book.publisher || ''} />
        <Input name="publicationYear" label="Publication Year" type="number" defaultValue={book.publicationYear || ''} />
        <Input name="language" label="Language" defaultValue={book.language || 'vi'} />
        <Input name="pages" label="Pages" type="number" defaultValue={book.pages || ''} />

        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label htmlFor="categoryId">Category</label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={book.categoryId || book.category?.id || ''}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="" disabled>-- Select category --</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Current Cover</label>
          {coverUrl && <img src={coverUrl} alt="Cover Preview" style={{ maxHeight: '120px', marginBottom: '8px', display: 'block' }} />}
          <input type="file" accept="image/*" onChange={handleCoverChange} />
          {uploadingCover && <p style={{ color: 'blue', fontSize: '14px' }}>Uploading cover...</p>}
        </div>

        <div className="input-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Current Book File (PDF/EPUB)</label>
          {bookFileUrl && <p style={{ fontSize: '13px', color: '#666' }}>Path: <span style={{ wordBreak: 'break-all' }}>{bookFileUrl}</span></p>}
          <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />
          {uploadingFile && <p style={{ color: 'blue', fontSize: '14px' }}>Uploading book file...</p>}
        </div>

        <Input name="price" label="Price" type="number" defaultValue={book.price} required />
        <Input name="originalPrice" label="Original Price" type="number" defaultValue={book.originalPrice || book.price} />
        <Input name="stock" label="Current Stock" type="number" defaultValue={book.stock} disabled />
        <Textarea name="description" label="Description" defaultValue={book.description} rows={5} />

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button type="button" onClick={() => navigate('/admin/books')}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={uploadingCover || uploadingFile}>
            Save Changes
          </Button>
        </div>
      </form>
    </section>
  );
}
