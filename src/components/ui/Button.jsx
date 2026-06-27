export default function Button({ children, loading, ...props }) {
  return (
    <button
      {...props}
      // Vô hiệu hóa nút bấm tự động khi đang ở trạng thái loading
      disabled={props.disabled || loading}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}