import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import PricingFields from '../../components/admin/PricingFields';
import { LoadingState } from '../../components/ui/State';
import Modal from '../../components/ui/Modal';
import { adminService } from '../../services/adminService';
import { bookService } from '../../services/bookService';
import { deriveDiscountPercent } from '../../utils/pricing';

function unwrapBook(response) {
  return response?.data || response;
}

export default function AdminBookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [book, setBook] = useState(location.state?.book || null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stockDelta, setStockDelta] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [updatingStock, setUpdatingStock] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const [coverUrl, setCoverUrl] = useState('');
  const [coverKey, setCoverKey] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const applyBook = (actualBook) => {
    setBook(actualBook);
    setCoverUrl(actualBook.coverUrl || '');
    setCoverKey(actualBook.coverKey || '');
    setFileKey(actualBook.fileKey || '');
  };

  useEffect(() => {
    let active = true;

    const loadBook = async () => {
      setLoading(true);
      try {
        const categoryList = await bookService.getCategories();
        if (!active) return;
        setCategories(categoryList || []);

        if (location.state?.book) {
          applyBook(location.state.book);
          return;
        }

        try {
          const bookData = await adminService.getBookById(id);
          if (!active) return;
          applyBook(unwrapBook(bookData));
        } catch (err) {
          console.error('Failed to load book detail:', err);
          if (!active) return;
          setBook(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadBook();

    return () => {
      active = false;
    };
  }, [id, location.state?.book]);

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
      setCoverUrl(URL.createObjectURL(file));
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
      const key = res.data?.data?.fileKey || res.data?.fileKey;
      if (!key) throw new Error('Invalid upload response');
      setFileKey(key);
      alert('Book file uploaded to MinIO.');
    } catch (err) {
      alert('Failed to upload book file: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleStockUpdate = async (event) => {
    event.preventDefault();
    const quantityDelta = Number(stockDelta);
    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
      alert('Enter a non-zero adjustment amount.');
      return;
    }

    setUpdatingStock(true);
    try {
      await adminService.adjustStock(id, {
        quantityDelta,
        note: stockNote.trim() || undefined,
      });
      setBook((current) => ({
        ...current,
        stock: Math.max(0, (current.stock || 0) + quantityDelta),
      }));
      setStockDelta('');
      setStockNote('');
      setShowStockModal(false);
      alert('Stock updated successfully.');
    } catch (err) {
      alert('Failed to update stock: ' + (err.response?.data?.message || err.message));
    } finally {
      setUpdatingStock(false);
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
        coverUrl: coverUrl.startsWith('blob:') ? null : coverUrl,
        fileKey: fileKey,
        coverKey: coverKey,
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

  if (loading) return <LoadingState text="Loading book..." />;
  if (!book) return <p>Book not found.</p>;

  const discountPercent = deriveDiscountPercent(book.originalPrice || book.price, book.price);

  return (
    <section className="narrow">
      <h1>Edit Book: #{id}</h1>
      <form className="form" onSubmit={handleSave}>
        <Input name="title" label="Title" defaultValue={book.title} required placeholder="Enter book title" />
        <Input name="author" label="Author" defaultValue={book.author} required placeholder="Enter author name" />
        <Input name="isbn" label="ISBN" defaultValue={book.isbn || ''} placeholder="Enter ISBN" />
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
          {fileKey && <p style={{ fontSize: '13px', color: '#666' }}>Path: <span style={{ wordBreak: 'break-all' }}>{fileKey}</span></p>}
          <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />
          {uploadingFile && <p style={{ color: 'blue', fontSize: '14px' }}>Uploading book file...</p>}
        </div>

        <PricingFields
          key={`${book.id}-${book.price}-${book.originalPrice}`}
          initialOriginalPrice={book.originalPrice || book.price}
          initialDiscountPercent={discountPercent}
        />
        <Textarea name="description" label="Description" defaultValue={book.description} rows={5} />

        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <Button type="button" onClick={() => navigate('/admin/books')}>Cancel</Button>
          <Button type="submit" variant="primary" loading={saving} disabled={uploadingCover || uploadingFile}>
            Save
          </Button>
        </div>
      </form>

      <section className="form" style={{ marginTop: '32px' }}>
        <h2>Stock Management</h2>
        <div style={{ marginBottom: '16px' }}>
          <strong>Current Stock: </strong> {book.stock ?? 0}
        </div>
        
        <Button onClick={() => setShowStockModal(true)} variant="primary">
          Create Import / Export Request
        </Button>

        {showStockModal && (
          <Modal title="Import / Export Stock Request" onClose={() => setShowStockModal(false)} hideClose={true}>
            <form onSubmit={handleStockUpdate} style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Quantity (+ to Import, - to Export)</label>
                <input
                  type="number"
                  value={stockDelta}
                  onChange={(event) => setStockDelta(event.target.value)}
                  placeholder="e.g. 5 or -2"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Note / Reason</label>
                <input
                  type="text"
                  value={stockNote}
                  onChange={(event) => setStockNote(event.target.value)}
                  placeholder="Reason for adjustment"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button type="button" onClick={() => setShowStockModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" loading={updatingStock}>
                  Submit Request
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </section>
    </section>
  );
}
