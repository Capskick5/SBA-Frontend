import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => { adminService.getCategories().then(setCategories); }, []);

  const saveCategory = async (event) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    const nextCategories = editingId
      ? await adminService.updateCategory(editingId, categoryName.trim())
      : await adminService.createCategory(categoryName.trim());
    setCategories(nextCategories);
    setCategoryName('');
    setEditingId(null);
  };

  return (
    <section className="stack">
      <h1>Manage Categories</h1>
      <form className="inline-form" onSubmit={saveCategory}>
        <Input
          label={editingId ? 'Edit category' : 'New category'}
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
        />
        <Button type="submit">{editingId ? 'Save' : 'Create'}</Button>
        {editingId && <Button type="button" onClick={() => { setEditingId(null); setCategoryName(''); }}>Cancel</Button>}
      </form>
      <Table
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'active', label: 'Active', render: (row) => (row.active ? 'Yes' : 'No') },
          {
            key: 'action',
            label: 'Action',
            render: (row) => (
              <div className="actions">
                <Button onClick={() => { setEditingId(row.id); setCategoryName(row.name); }}>Edit</Button>
                <Button onClick={() => adminService.toggleCategoryActive(row.id).then(setCategories)}>
                  {row.active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button onClick={() => adminService.deleteCategory(row.id).then(setCategories)}>Delete</Button>
              </div>
            ),
          },
        ]}
        rows={categories}
      />
    </section>
  );
}
