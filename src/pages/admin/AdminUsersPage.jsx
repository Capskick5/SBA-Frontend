import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

function formatRole(role) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'CUSTOMER') return 'Customer';
  return role || 'Customer';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  const fetchUsers = () => {
    adminService.getUsers()
      .then((res) => {
        const list = res.data?.items || res.items || (Array.isArray(res) ? res : []);
        setUsers(list);
      })
      .catch((err) => console.error('Failed to load users:', err));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggle = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id, !user.enabled);
      fetchUsers();
    } catch {
      alert('Failed to update user status.');
    }
  };

  return (
    <section className="stack">
      <h1>User Management</h1>
      <Table
        emptyText="No users found."
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'fullName', label: 'Name' },
          {
            key: 'role',
            label: 'Account Type',
            render: (row) => (
              <span className={row.role === 'ADMIN' ? 'user-role-badge is-admin' : 'user-role-badge'}>
                {formatRole(row.role)}
              </span>
            ),
          },
          { key: 'enabled', label: 'Status', render: (row) => row.enabled ? 'Active' : 'Locked' },
          {
            key: 'action', label: 'Actions', render: (row) =>
              row.role === 'ADMIN' ? (
                <span className="muted">Protected</span>
              ) : (
                <Button onClick={() => handleToggle(row)}>
                  {row.enabled ? 'Lock' : 'Unlock'}
                </Button>
              )
          },
        ]}
        rows={users}
      />
    </section>
  );
}
