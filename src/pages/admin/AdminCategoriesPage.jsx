import { useEffect, useState } from 'react';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  useEffect(() => { adminService.getCategories().then(setCategories); }, []);
  return (
    <section className="stack">
      <h1>Manage Categories</h1>
      <Table columns={[{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }]} rows={categories} />
    </section>
  );
}
