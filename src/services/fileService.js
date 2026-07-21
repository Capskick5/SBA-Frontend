import { apiClient } from '../api/apiClient';

function toFormData(file) {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

export const fileService = {
  /** Upload book cover to MinIO (`coverKey`). */
  async uploadThumbnail(file) {
    return apiClient.post('/admin/uploads/thumbnail', toFormData(file));
  },

  /** Upload PDF/EPUB book file to MinIO (`fileKey`). */
  async uploadBookFile(file) {
    return apiClient.post('/admin/uploads/book-file', toFormData(file));
  },
};
