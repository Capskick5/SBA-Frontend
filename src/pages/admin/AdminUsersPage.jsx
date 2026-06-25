import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => { adminService.getUsers().then(setUsers); }, []);
  return (
    <section className="stack">
      <h1>Manage Users</h1>
      <Table
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'fullName', label: 'Name' },
          { key: 'role', label: 'Role' },
          { key: 'action', label: 'Action', render: () => <Button>Enable/Disable</Button> },
        ]}
        rows={users}
      />
    </section>
  );
}
