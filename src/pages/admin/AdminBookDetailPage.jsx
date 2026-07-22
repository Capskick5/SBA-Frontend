import { useEffect, useRef, useState } from 'react';

import { useParams, useNavigate, useLocation } from 'react-router-dom';

import Button from '../../components/ui/Button';

import Input from '../../components/ui/Input';

import Textarea from '../../components/ui/Textarea';

import PricingFields from '../../components/admin/PricingFields';

import { EmptyState, LoadingState } from '../../components/ui/State';

import Modal from '../../components/ui/Modal';

import AdminPagination from '../../components/ui/AdminPagination';

import { adminService } from '../../services/adminService';

import { bookService } from '../../services/bookService';

import { deriveDiscountPercent } from '../../utils/pricing';

import { formatDateTime } from '../../utils/formatters';



const FIELD_LABELS = {

  title: 'Tiêu đề',

  author: 'Tác giả',

  isbn: 'ISBN',

  publisher: 'Nhà xuất bản',

  publicationYear: 'Năm xuất bản',

  language: 'Ngôn ngữ',

  pages: 'Số trang',

  category: 'Danh mục',

  price: 'Giá bán',

  originalPrice: 'Giá gốc',

  description: 'Mô tả',

  coverUrl: 'URL bìa',

  fileKey: 'Tệp số',

  coverKey: 'Tệp bìa',

  active: 'Hiển thị',

};



function unwrapBook(response) {

  return response?.data || response;

}



export default function AdminBookDetailPage() {

  const { id } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const [book, setBook] = useState(location.state?.book || null);

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [stockDelta, setStockDelta] = useState('');

  const [stockNote, setStockNote] = useState('');

  const [updatingStock, setUpdatingStock] = useState(false);

  const [showStockModal, setShowStockModal] = useState(false);

  const [changeLogs, setChangeLogs] = useState([]);

  const [changeLogsLoading, setChangeLogsLoading] = useState(true);

  const [changeLogPage, setChangeLogPage] = useState(0);

  const [changeLogTotalPages, setChangeLogTotalPages] = useState(0);



  const [coverUrl, setCoverUrl] = useState('');

  const [coverKey, setCoverKey] = useState('');

  const [fileKey, setFileKey] = useState('');

  const [uploadingCover, setUploadingCover] = useState(false);

  const [uploadingFile, setUploadingFile] = useState(false);

  const descriptionRef = useRef(null);



  const resizeDescription = () => {

    const textarea = descriptionRef.current;

    if (!textarea) return;

    textarea.style.height = 'auto';

    textarea.style.height = `${textarea.scrollHeight}px`;

  };



  const applyBook = (actualBook) => {

    setBook(actualBook);

    setCoverUrl(actualBook.coverUrl || '');

    setCoverKey(actualBook.coverKey || '');

    setFileKey(actualBook.fileKey || '');

  };



  useEffect(() => {

    let active = true;



    const loadBook = async () => {

      setLoading(true);

      try {

        const categoryList = await bookService.getCategories();

        if (!active) return;

        setCategories(categoryList || []);



        if (location.state?.book) {

          applyBook(location.state.book);

          return;

        }



        try {

          const bookData = await adminService.getBookById(id);

          if (!active) return;

          applyBook(unwrapBook(bookData));

        } catch (err) {

          console.error('Failed to load book detail:', err);

          if (!active) return;

          setBook(null);

        }

      } finally {

        if (active) {

          setLoading(false);

        }

      }

    };



    loadBook();



    return () => {

      active = false;

    };

  }, [id, location.state?.book]);



  useEffect(() => {

    let active = true;

    Promise.resolve().then(() => setChangeLogsLoading(true));

    adminService.getBookChangeLogs(id, { page: changeLogPage, size: 10, sort: 'createdAt,desc' })

      .then((result) => {

        if (!active) return;

        setChangeLogs(result?.items || result?.content || []);

        setChangeLogTotalPages(result?.totalPages || 0);

      })

      .catch((err) => {

        console.error('Failed to load book change history:', err);

        if (active) {

          setChangeLogs([]);

          setChangeLogTotalPages(0);

        }

      })

      .finally(() => {

        if (active) setChangeLogsLoading(false);

      });

    return () => {

      active = false;

    };

  }, [id, changeLogPage]);



  useEffect(() => {

    resizeDescription();

  }, [book?.description]);



  const handleCoverChange = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setUploadingCover(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      const res = await adminService.uploadThumbnail(formData);

      const key = res.data?.data?.coverKey || res.data?.coverKey;

      if (!key) throw new Error('Invalid upload response');

      setCoverKey(key);

      setCoverUrl(URL.createObjectURL(file));

      alert('Đã tải bìa lên MinIO.');

    } catch (err) {

      alert('Không thể tải bìa lên: ' + err.message);

    } finally {

      setUploadingCover(false);

    }

  };



  const handleBookFileChange = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    setUploadingFile(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      const res = await adminService.uploadBookFile(formData);

      const key = res.data?.data?.fileKey || res.data?.fileKey;

      if (!key) throw new Error('Invalid upload response');

      setFileKey(key);

      alert('Đã tải tệp sách lên MinIO.');

    } catch (err) {

      alert('Không thể tải tệp sách lên: ' + err.message);

    } finally {

      setUploadingFile(false);

    }

  };



  const handleStockUpdate = async (event) => {

    event.preventDefault();

    const quantityDelta = Number(stockDelta);

    if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {

      alert('Nhập số lượng điều chỉnh khác 0.');

      return;

    }



    setUpdatingStock(true);

    try {

      await adminService.adjustStock(id, {

        quantityDelta,

        note: stockNote.trim() || undefined,

      });

      setBook((current) => ({

        ...current,

        stock: Math.max(0, (current.stock || 0) + quantityDelta),

      }));

      setStockDelta('');

      setStockNote('');

      setShowStockModal(false);

      alert('Cập nhật tồn kho thành công.');

    } catch (err) {

      alert('Không thể cập nhật tồn kho: ' + (err.response?.data?.message || err.message));

    } finally {

      setUpdatingStock(false);

    }

  };



  const handleSave = async (event) => {

    event.preventDefault();

    setSaving(true);

    try {

      const formData = new FormData(event.target);

      const values = Object.fromEntries(formData.entries());



      const payload = {

        title: values.title,

        author: values.author,

        isbn: values.isbn || null,

        publisher: values.publisher || null,

        publicationYear: values.publicationYear ? Number(values.publicationYear) : null,

        language: values.language || book.language || 'vi',

        pages: values.pages ? Number(values.pages) : null,

        categoryId: Number(values.categoryId),

        price: Number(values.price),

        originalPrice: values.originalPrice ? Number(values.originalPrice) : Number(values.price),

        description: values.description || '',

        coverUrl: coverUrl.startsWith('blob:') ? null : coverUrl,

        fileKey: fileKey,

        coverKey: coverKey,

        active: book.active ?? true,

      };



      await adminService.updateBook(id, payload);

      alert('Cập nhật sách thành công.');

      navigate('/admin/books');

    } catch (err) {

      const errorMsg = err.response?.data?.message || err.message;

      const isRagError = /rag|ingest|vector|index|embedding|timeout|ai/i.test(errorMsg);



      if (isRagError) {

        console.warn('RAG sync failed after the core book update:', errorMsg);

        alert('Cập nhật sách thành công. Đồng bộ tìm kiếm AI đang chạy nền.');

        navigate('/admin/books');

      } else {

        alert(`Không thể cập nhật sách: ${errorMsg}`);

      }

    } finally {

      setSaving(false);

    }

  };



  if (loading) return <LoadingState text="Đang tải sách..." />;

  if (!book) {

    return (

      <EmptyState title="Không tìm thấy sách" text="Sách này có thể đã bị xóa hoặc không còn khả dụng.">

        <Button type="button" variant="secondary" onClick={() => navigate('/admin/books')}>Quay lại danh sách sách</Button>

      </EmptyState>

    );

  }



  const discountPercent = deriveDiscountPercent(book.originalPrice || book.price, book.price);



  return (

    <section className="admin-book-detail-page">

      <div className="admin-book-detail-header">

        <div>

          <span className="admin-book-detail-kicker">Kho sách</span>

          <h1>Sửa sách #{id}</h1>

          <p>Cập nhật nội dung, giá, phương tiện và tồn kho từ một không gian làm việc.</p>

        </div>

        <div className="admin-book-detail-header-actions">

          <Button type="button" variant="secondary" onClick={() => navigate('/admin/books')}>Hủy</Button>

          <Button

            type="submit"

            form="admin-book-detail-form"

            variant="primary"

            loading={saving}

            disabled={uploadingCover || uploadingFile}

          >

            Lưu thay đổi

          </Button>

        </div>

      </div>



      <form id="admin-book-detail-form" className="admin-book-detail-layout" onSubmit={handleSave}>

        <aside className="admin-book-detail-sidebar">

          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Bìa sách</h2>

              <span>Ảnh hiển thị trên cửa hàng</span>

            </div>

            <div className="admin-book-cover-preview">

              {coverUrl ? (

                <img src={coverUrl} alt="Xem trước bìa" />

              ) : (

                <span>Chưa có bìa</span>

              )}

            </div>

            <label className="admin-book-upload-control">

              <span>Thay bìa</span>

              <input type="file" accept="image/*" onChange={handleCoverChange} />

            </label>

            {uploadingCover && <p className="form-hint">Đang tải bìa lên...</p>}

          </section>



          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Tệp số</h2>

              <span>Nguồn PDF hoặc EPUB</span>

            </div>

            {fileKey ? (

              <p className="admin-book-file-key">Đường dẫn: <span>{fileKey}</span></p>

            ) : (

              <p className="form-hint">Chưa liên kết tệp số.</p>

            )}

            <label className="admin-book-upload-control">

              <span>Thay tệp</span>

              <input type="file" accept=".pdf,.epub" onChange={handleBookFileChange} />

            </label>

            {uploadingFile && <p className="form-hint">Đang tải tệp sách lên...</p>}

          </section>



          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Tồn kho</h2>

              <span>Điều chỉnh tồn kho</span>

            </div>

            <div className="admin-book-stock-value">

              <span>Tồn kho hiện tại</span>

              <strong>{book.stock ?? 0}</strong>

            </div>

            <Button type="button" onClick={() => setShowStockModal(true)} variant="primary">

              Điều chỉnh tồn kho

            </Button>

          </section>

        </aside>



        <main className="admin-book-detail-main">

          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Thông tin cơ bản</h2>

              <span>Tiêu đề, tác giả, danh mục và siêu dữ liệu</span>

            </div>

            <div className="admin-book-field-grid">

              <div className="admin-book-field-wide">

                <Input name="title" label="Tiêu đề" defaultValue={book.title} required placeholder="Nhập tiêu đề sách" />

              </div>

              <Input name="author" label="Tác giả" defaultValue={book.author} required placeholder="Nhập tên tác giả" />

              <Input name="isbn" label="ISBN" defaultValue={book.isbn || ''} placeholder="Nhập ISBN" />

              <Input name="publisher" label="Nhà xuất bản" defaultValue={book.publisher || ''} />

              <Input name="publicationYear" label="Năm xuất bản" type="number" defaultValue={book.publicationYear || ''} />

              <Input name="language" label="Ngôn ngữ" defaultValue={book.language || 'vi'} />

              <Input name="pages" label="Số trang" type="number" defaultValue={book.pages || ''} />

              <label className="field">

                <span>Danh mục</span>

                <select

                  id="categoryId"

                  name="categoryId"

                  required

                  defaultValue={book.categoryId || book.category?.id || ''}

                >

                  <option value="" disabled>-- Chọn danh mục --</option>

                  {categories.map((category) => (

                    <option key={category.id} value={category.id}>{category.name}</option>

                  ))}

                </select>

              </label>

            </div>

          </section>



          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Giá</h2>

              <span>Giá bán hiện tại và giảm giá</span>

            </div>

            <PricingFields

              key={`${book.id}-${book.price}-${book.originalPrice}`}

              initialOriginalPrice={book.originalPrice || book.price}

              initialDiscountPercent={discountPercent}

            />

          </section>



          <section className="admin-book-panel">

            <div className="admin-book-panel-heading">

              <h2>Mô tả</h2>

              <span>Nội dung hiển thị trên cửa hàng</span>

            </div>

            <Textarea

              ref={descriptionRef}

              name="description"

              label="Mô tả"

              defaultValue={book.description}

              rows={8}

              className="admin-book-description-textarea"

              onInput={resizeDescription}

            />

          </section>

        </main>

      </form>



      <section className="admin-book-panel admin-book-change-history">

        <div className="admin-book-panel-heading">

          <h2>Thay đổi gần đây</h2>

          <span>Cập nhật theo từng trường mới nhất</span>

        </div>

        {changeLogsLoading ? (

          <p className="form-hint">Đang tải lịch sử thay đổi...</p>

        ) : changeLogs.length === 0 ? (

          <p className="form-hint">Chưa ghi nhận thay đổi thông tin sách nào.</p>

        ) : (

          <div className="admin-book-change-list">

            {changeLogs.map((log) => (

              <article className="admin-book-change-item" key={log.id}>

                <div className="admin-book-change-meta">

                  <strong>{FIELD_LABELS[log.fieldName] || log.fieldName}</strong>

                  <span>{log.changedByName || `Admin #${log.changedBy}`} · {formatDateTime(log.createdAt)}</span>

                </div>

                <div className="admin-book-change-values">

                  <div>

                    <span>Trước</span>

                    <p>{log.oldValue || 'Chưa đặt'}</p>

                  </div>

                  <div>

                    <span>Sau</span>

                    <p>{log.newValue || 'Chưa đặt'}</p>

                  </div>

                </div>

              </article>

            ))}

            <AdminPagination

              page={changeLogPage}

              totalPages={changeLogTotalPages}

              onPageChange={setChangeLogPage}

            />

          </div>

        )}

      </section>



      {showStockModal && (

        <Modal title="Yêu cầu nhập / xuất kho" onClose={() => setShowStockModal(false)} hideClose={true}>

          <form onSubmit={handleStockUpdate} style={{ padding: '16px' }}>

            <div style={{ marginBottom: '16px' }}>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Số lượng (+ nhập, - xuất)</label>

              <input

                type="number"

                value={stockDelta}

                onChange={(event) => setStockDelta(event.target.value)}

                placeholder="vd. 5 hoặc -2"

                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}

              />

            </div>

            <div style={{ marginBottom: '16px' }}>

              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Ghi chú / Lý do</label>

              <input

                type="text"

                value={stockNote}

                onChange={(event) => setStockNote(event.target.value)}

                placeholder="Lý do điều chỉnh"

                style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}

              />

            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>

              <Button type="button" variant="secondary" onClick={() => setShowStockModal(false)}>Hủy</Button>

              <Button type="submit" variant="primary" loading={updatingStock}>

                Gửi yêu cầu

              </Button>

            </div>

          </form>

        </Modal>

      )}

    </section>

  );

}


