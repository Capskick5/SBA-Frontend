import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  BookOpen,
  ArrowUpDown,
  X,
  Check,
} from 'lucide-react';
import { formatCategoryName } from '../../utils/formatters';

export default function CatalogSidebar({
  query,
  setQuery,
  category,
  setCategory,
  sort,
  setSort,
  categories = [],
}) {
  const isFiltered = query !== '' || category !== 'all' || sort !== 'relevance';

  const handleReset = () => {
    setQuery('');
    setCategory('all');
    setSort('relevance');
  };

  const sortOptions = [
    { value: 'relevance', label: 'Liên quan' },
    { value: 'sold_desc', label: 'Bán chạy nhất' },
    { value: 'rating_desc', label: 'Đánh giá cao' },
    { value: 'title_asc', label: 'Tên A - Z' },
    { value: 'price_asc', label: 'Giá thấp đến cao' },
    { value: 'price_desc', label: 'Giá cao đến thấp' },
  ];

  return (
    <div className="catalog-sidebar-inner">
      {/* Header */}
      <div className="catalog-sidebar-header">
        <div className="catalog-sidebar-title">
          <SlidersHorizontal size={18} className="sidebar-header-icon" />
          <span>Bộ lọc tìm kiếm</span>
        </div>
        {isFiltered && (
          <button
            type="button"
            className="catalog-sidebar-reset-btn"
            onClick={handleReset}
            title="Xóa bộ lọc"
          >
            <RotateCcw size={13} />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <div className="catalog-sidebar-section">
        <label className="catalog-section-label">
          <Search size={14} />
          <span>Tìm kiếm</span>
        </label>
        <div className="catalog-search-input-wrapper">
          <Search size={15} className="search-input-icon" />
          <input
            type="text"
            placeholder="Nhập tên sách..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="search-input-clear"
              onClick={() => setQuery('')}
              aria-label="Xóa từ khóa"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Categories Filter List */}
      <div className="catalog-sidebar-section">
        <label className="catalog-section-label">
          <BookOpen size={14} />
          <span>Danh mục sách</span>
        </label>
        <div className="catalog-category-list">
          <div
            className={`catalog-category-item${category === 'all' ? ' is-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            <span className="category-name">Tất cả</span>
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

      {/* Sort Options */}
      <div className="catalog-sidebar-section">
        <label className="catalog-section-label">
          <ArrowUpDown size={14} />
          <span>Sắp xếp theo</span>
        </label>
        <div className="catalog-sort-list">
          {sortOptions.map((opt) => {
            const isActive = sort === opt.value;
            return (
              <div
                key={opt.value}
                className={`catalog-sort-item${isActive ? ' is-active' : ''}`}
                onClick={() => setSort(opt.value)}
              >
                <span className="sort-radio-indicator" />
                <span className="sort-label">{opt.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
