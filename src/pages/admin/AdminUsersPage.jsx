import { useEffect, useState } from 'react';

import Button from '../../components/ui/Button';

import AdminPagination from '../../components/ui/AdminPagination';

import Table from '../../components/ui/Table';

import { ErrorState, LoadingState } from '../../components/ui/State';

import { adminService } from '../../services/adminService';

import { showToast } from '../../utils/toast';



const PAGE_SIZE = 10;



function formatRole(role) {

  if (role === 'ADMIN') return 'Quản trị viên';

  if (role === 'CUSTOMER') return 'Khách hàng';

  return role || 'Khách hàng';

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

      setError('Không thể tải tài khoản người dùng.');

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

        setError('Không thể tải tài khoản người dùng.');

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

      showToast(`Đã ${user.enabled ? 'khóa' : 'mở khóa'} tài khoản khách hàng.`);

    } catch {

      showToast('Không thể cập nhật trạng thái người dùng.', 'error');

    }

  };



  const changePage = (nextPage) => {

    setLoading(true);

    setError('');

    setCurrentPage(nextPage);

  };



  return (

    <section className="stack">

      <h1>Quản lý người dùng</h1>

      {loading ? <LoadingState text="Đang tải người dùng..." /> : error ? (

        <ErrorState text={error}><Button onClick={() => fetchUsers(currentPage)}>Thử lại</Button></ErrorState>

      ) : (

        <>

          <Table

            emptyText="Không tìm thấy người dùng nào."

            columns={[

              { key: 'email', label: 'Email' },

              { key: 'fullName', label: 'Tên' },

              {

                key: 'role',

                label: 'Loại tài khoản',

                render: (row) => (

                  <span className={row.role === 'ADMIN' ? 'user-role-badge is-admin' : 'user-role-badge'}>

                    {formatRole(row.role)}

                  </span>

                ),

              },

              { key: 'enabled', label: 'Trạng thái', render: (row) => row.enabled ? 'Đang hoạt động' : 'Đã khóa' },

              {

                key: 'action', label: 'Thao tác', render: (row) =>

                  row.role === 'ADMIN' ? (

                    <span className="muted">Được bảo vệ</span>

                  ) : (

                    <div className="admin-row-actions">

                      <Button type="button" variant="secondary" size="sm" className={row.enabled ? 'danger-action' : ''} onClick={() => handleToggle(row)}>

                        {row.enabled ? 'Khóa' : 'Mở khóa'}

                      </Button>

                    </div>

                  )

              },

            ]}

            rows={users}

          />

          {users.length > 0 && (

            <AdminPagination

              page={currentPage}

              totalPages={totalPages}

              onPageChange={changePage}

            />

          )}

        </>

      )}

    </section>

  );

}

