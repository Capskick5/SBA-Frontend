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

  // 1. ĐỊNH NGHĨA HÀM HANDLE SAVE TRƯỚC KHI DÙNG TRONG RETURN
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      const payload = {
        title: data.title,
        author: data.author,
        price: Number(data.price),
        stock: Number(data.stock),
        categoryId: Number(data.categoryId),
        description: data.description || "",
        isbn: data.isbn || "N/A",
        publisher: data.publisher || "N/A",
        publicationYear: Number(data.publicationYear) || 2026,
        language: data.language || "vi",
        active: true
      };

      if (id === 'new') {
        await adminService.addBook(payload);
        alert("Thêm thành công!");
      } else {
        await adminService.updateBook(id, payload);
        alert("Cập nhật thành công!");
      }
      navigate('/admin/books');
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Gọi API song song
    Promise.all([
      bookService.getCategories(),
      id !== 'new' ? adminService.getBookById(id) : Promise.resolve(null)
    ])
      .then(([catRes, bookRes]) => {
        setCategories(catRes || []);
        if (bookRes) {
          const responseData = bookRes.data || bookRes;
          setBook(responseData.data || responseData);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p>Đang tải...</p>;

  return (
    <section className="narrow">
      <h1>{id === 'new' ? 'Thêm sách mới' : `Sửa sách: #${id}`}</h1>
      <form className="form" onSubmit={handleSave}>
        <Input name="title" label="Tên sách" defaultValue={book?.title} required />
        <Input name="author" label="Tác giả" defaultValue={book?.author} required />

        <div className="input-group">
          <label>Thể loại</label>
          <select name="categoryId" required defaultValue={book?.categoryId || ""} style={{ width: '100%', padding: '10px' }}>
            <option value="" disabled>-- Chọn thể loại --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <Input name="price" label="Giá" type="number" defaultValue={book?.price} required />
        <Input name="stock" label="Số lượng" type="number" defaultValue={book?.stock} required />
        <Textarea name="description" label="Mô tả" defaultValue={book?.description} rows={5} />

        <Button type="submit" loading={saving}>Lưu thay đổi</Button>
      </form>
    </section>
  );
}