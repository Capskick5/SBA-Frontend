import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { ErrorState, LoadingState } from '../../components/ui/State';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';

const PAGE_SIZE = 10;

function formatRole(role) {
  if (role === 'ADMIN') return 'Admin';
  if (role === 'CUSTOMER') return 'Customer';
  return role || 'Customer';
}

function normalizeUsersResponse(response) {
  const responseBody = response?.data || response;
  if (responseBody?.items && Array.isArray(responseBody.items)) {
    return { items: responseBody.items, totalPages: responseBody.totalPages || 1 };
  }
  if (Array.isArray(responseBody)) {
    return { items: responseBody, totalPages: 1 };
  }
  return { items: [], totalPages: 1 };
}

async function requestUsers(pageIndex) {
  return normalizeUsersResponse(
    await adminService.getUsers({ page: pageIndex, size: PAGE_SIZE }),
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (pageIndex) => {
    setLoading(true);
    setError('');
    try {
      const result = await requestUsers(pageIndex);
      setUsers(result.items);
      setTotalPages(result.totalPages);
    } catch (requestError) {
      console.error('Failed to load users:', requestError);
      setError('Could not load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    requestUsers(currentPage)
      .then((result) => {
        if (!active) return;
        setUsers(result.items);
        setTotalPages(result.totalPages);
      })
      .catch((requestError) => {
        if (!active) return;
        console.error('Failed to load users:', requestError);
        setError('Could not load user accounts.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentPage]);

  const handleToggle = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id, !user.enabled);
      await fetchUsers(currentPage);
      showToast(`Customer account ${user.enabled ? 'locked' : 'unlocked'}.`);
    } catch {
      showToast('Failed to update user status.', 'error');
    }
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setError('');
    setCurrentPage(nextPage);
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
                onClick={() => changePage(currentPage - 1)}
              >
                Previous
              </Button>
              <span>Page {currentPage + 1} of {totalPages}</span>
              <Button
                type="button"
                className="btn-secondary"
                disabled={currentPage >= totalPages - 1}
                onClick={() => changePage(currentPage + 1)}
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
