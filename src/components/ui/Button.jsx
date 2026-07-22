const VARIANT_CLASS = {
  primary: '',
  secondary: 'btn-secondary',
  outline: 'btn-secondary',
};

const SIZE_CLASS = {
  sm: 'btn-sm',
  small: 'btn-sm',
};

export default function Button({
  children,
  loading,
  className = '',
  variant = 'primary',
  size,
  ...props
}) {
  const variantClass = VARIANT_CLASS[variant] ?? '';
  const sizeClass = SIZE_CLASS[size] ?? '';
  const classes = ['btn', variantClass, sizeClass, className].filter(Boolean).join(' ');

  return (
    <button
      {...props}
      className={classes}
      disabled={props.disabled || loading}
    >
      {loading ? 'Đang xử lý...' : children}
    </button>
  );
}
