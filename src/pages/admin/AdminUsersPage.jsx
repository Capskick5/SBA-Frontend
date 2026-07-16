import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';

function formatRole(role) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'CUSTOMER') return 'Customer';
  return role || 'Customer';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const fetchUsers = (pageIndex) => {
    setLoading(true);
    setError('');
    adminService.getUsers({ page: pageIndex, size: PAGE_SIZE })
      .then((res) => {
        const responseBody = res.data || res;
        if (responseBody?.items && Array.isArray(responseBody.items)) {
          setUsers(responseBody.items);
          setTotalPages(responseBody.totalPages || 1);
        } else if (Array.isArray(responseBody)) {
          setUsers(responseBody);
          setTotalPages(1);
        } else {
          setUsers([]);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        console.error('Failed to load users:', err);
        setError('Could not load user accounts.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage]);

  const handleToggle = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id, !user.enabled);
      fetchUsers(currentPage);
    } catch {
      alert('Failed to update user status.');
    }
  };

  return (
    <section className="stack">
      <h1>User Management</h1>
      {loading ? <LoadingState text="Loading users..." /> : error ? (
        <ErrorState text={error}><Button onClick={() => fetchUsers(currentPage)}>Try again</Button></ErrorState>
      ) : (
        <>
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
          {users.length > 0 && (
            <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>Page {currentPage + 1} of {totalPages}</span>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
