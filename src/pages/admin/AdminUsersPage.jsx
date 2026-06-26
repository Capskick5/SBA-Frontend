import { useEffect, useState } from 'react';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import { adminService } from '../../services/adminService';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    adminService.getAllUsers().then(setUsers);
  }, []);

  const handleToggle = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id, !user.enabled);
      // Refresh lại danh sách sau khi update
      const updatedUsers = await adminService.getAllUsers();
      setUsers(updatedUsers);
    } catch (err) {
      alert("Lỗi cập nhật trạng thái người dùng");
    }
  };

  return (
    <section className="stack">
      <h1>Quản lý Người dùng</h1>
      <Table
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'fullName', label: 'Tên' },
          { key: 'enabled', label: 'Trạng thái', render: (row) => row.enabled ? 'Đang hoạt động' : 'Bị khóa' },
          {
            key: 'action', label: 'Hành động', render: (row) =>
              <Button onClick={() => handleToggle(row)}>
                {row.enabled ? 'Khóa' : 'Mở khóa'}
              </Button>
          },
        ]}
        rows={users}
      />
    </section>
  );
}