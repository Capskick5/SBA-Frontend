import {
  SlidersHorizontal,
  RotateCcw,
  BookOpen,
  Check,
} from 'lucide-react';
import { formatCategoryName } from '../../utils/formatters';

export default function CatalogSidebar({
  category,
  setCategory,
  categories = [],
}) {
  const isFiltered = category !== 'all';

  const handleReset = () => {
    setCategory('all');
  };

  return (
    <div className="catalog-sidebar-inner">
      {/* Header */}
      <div className="catalog-sidebar-header">
        <div className="catalog-sidebar-title">
          <SlidersHorizontal size={18} className="sidebar-header-icon" />
          <span>Danh mục sản phẩm</span>
        </div>
        {isFiltered && (
          <button
            type="button"
            className="catalog-sidebar-reset-btn"
            onClick={handleReset}
            title="Xóa bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Tất cả</span>
          </button>
        )}
      </div>

      {/* Categories Filter List */}
      <div className="catalog-sidebar-section">
        <label className="catalog-section-label">
          <BookOpen size={14} />
          <span>Thể loại sách</span>
        </label>
        <div className="catalog-category-list">
          <div
            className={`catalog-category-item${category === 'all' ? ' is-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            <span className="category-name">Tất cả danh mục</span>
            {category === 'all' && <Check size={14} className="category-check" />}
          </div>
          {categories.map((item) => {
            const isActive = String(category) === String(item.id);
            return (
              <div
                key={item.id}
                className={`catalog-category-item${isActive ? ' is-active' : ''}`}
                onClick={() => setCategory(String(item.id))}
              >
                <span className="category-name">{formatCategoryName(item.name)}</span>
                {isActive && <Check size={14} className="category-check" />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
