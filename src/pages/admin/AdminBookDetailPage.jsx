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

  useEffect(() => {
    Promise.all([
      bookService.getCategories(),
      adminService.getBookById(id),
    ])
      .then(([categoryList, bookData]) => {
        setCategories(categoryList || []);
        setBook(bookData);
      })
      .catch((err) => {
        console.error('Lỗi tải thông tin sách:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
        coverUrl: book.coverUrl,
        fileKey: book.fileKey,
        coverKey: book.coverKey,
        active: book.active,
      };

      await adminService.updateBook(id, payload);
      alert('Cập nhật thành công!');
      navigate('/admin/books');
    } catch (err) {
      alert(`Lỗi: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p>Đang tải...</p>;
  if (!book) return <p>Không tìm thấy sách.</p>;

  return (
    <section className="narrow">
      <h1>Sửa sách: #{id}</h1>
      <form className="form" onSubmit={handleSave}>
        <Input name="title" label="Tên sách" defaultValue={book.title} required />
        <Input name="author" label="Tác giả" defaultValue={book.author} required />
        <Input name="isbn" label="ISBN" defaultValue={book.isbn || ''} />
        <Input name="publisher" label="Nhà xuất bản" defaultValue={book.publisher || ''} />
        <Input name="publicationYear" label="Năm xuất bản" type="number" defaultValue={book.publicationYear || ''} />
        <Input name="language" label="Ngôn ngữ" defaultValue={book.language || 'vi'} />
        <Input name="pages" label="Số trang" type="number" defaultValue={book.pages || ''} />

        <div className="input-group">
          <label htmlFor="categoryId">Thể loại</label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={book.categoryId || book.category?.id || ''}
            style={{ width: '100%', padding: '10px' }}
          >
            <option value="" disabled>-- Chọn thể loại --</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>

        <Input name="price" label="Giá" type="number" defaultValue={book.price} required />
        <Input name="originalPrice" label="Giá gốc" type="number" defaultValue={book.originalPrice || book.price} />
        <Input name="stock" label="Kho hiện tại" type="number" defaultValue={book.stock} disabled />
        <Textarea name="description" label="Mô tả" defaultValue={book.description} rows={5} />

        <Button type="submit" loading={saving}>Lưu thay đổi</Button>
      </form>
    </section>
  );
}
