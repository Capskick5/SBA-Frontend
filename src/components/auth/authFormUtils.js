export function getFieldErrors(error) {
  return error?.errors || {};
}

export function captureFormError(err, setError, setFieldErrors) {
  setError(err);
  setFieldErrors(err.errors || {});
}
