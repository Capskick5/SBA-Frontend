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
        const list = res.data?.items || res.items || (Array.isArray(res) ? res : []);
        setCategories(list);
      })
      .catch((err) => console.error('Failed to load categories:', err));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    try {
      const slug = newCatName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      await adminService.addCategory({
        name: newCatName,
        slug: slug,
        active: true
      });

      alert('Category created successfully.');
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      alert('Failed to create category: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="stack">
      <h1>Category Management</h1>
      
      <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px', maxWidth: '500px' }}>
        <div style={{ flex: 1 }}>
          <Input 
            label="New Category Name" 
            placeholder="Enter category name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary" loading={submitting} style={{ height: '42px' }}>
          Add
        </Button>
      </form>

      <Table
        emptyText="No categories found."
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Category Name' },
          { key: 'slug', label: 'Slug' },
        ]}
        rows={categories}
      />
    </section>
  );
}
