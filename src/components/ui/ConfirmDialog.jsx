import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ title = 'Xác nhận', children, onCancel, onConfirm }) {
  return (
    <Modal title={title} onClose={onCancel} hideClose>
      <div className="stack">
        <p>{children}</p>
        <div className="confirm-dialog-actions">
          <Button type="button" className="btn-secondary" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="button" onClick={onConfirm}>
            Xác nhận
          </Button>
        </div>
      </div>
    </Modal>
  );
}
