import { useEffect, useState } from 'react';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { adminService } from '../../services/adminService';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = () => {
    adminService.getCategories()
      .then((res) => {
        // Bóc tách danh sách từ object phân trang của Backend
        const list = res.data?.items || res.items || (Array.isArray(res) ? res : []);
        setCategories(list);
      })
      .catch((err) => console.error("Lỗi tải danh mục:", err));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    try {
      // Tự sinh slug từ tên danh mục
      const slug = newCatName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      await adminService.addCategory({
        name: newCatName,
        slug: slug,
        active: true
      });

      alert("Thêm danh mục thành công!");
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      alert("Lỗi thêm danh mục: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="stack">
      <h1>Quản lý Danh mục</h1>
      
      {/* Form thêm danh mục mới cực kỳ tinh tế */}
      <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px', maxWidth: '500px' }}>
        <div style={{ flex: 1 }}>
          <Input 
            label="Tên danh mục mới" 
            placeholder="Nhập tên danh mục..." 
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary" loading={submitting} style={{ height: '42px' }}>
          Thêm
        </Button>
      </form>

      <Table
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Tên danh mục' },
          { key: 'slug', label: 'Slug' },
        ]}
        rows={categories}
      />
    </section>
  );
}
