import {
  SlidersHorizontal,
  BookOpen,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { formatCategoryName } from '../../utils/formatters';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Liên quan' },
  { value: 'sold_desc', label: 'Bán chạy nhất' },
  { value: 'rating_desc', label: 'Đánh giá cao' },
  { value: 'title_asc', label: 'Tên A - Z' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
];

export default function CatalogSidebar({
  category,
  setCategory,
  sort = 'relevance',
  setSort,
  categories = [],
}) {
  return (
    <div className="catalog-sidebar-inner">
      <div className="catalog-sidebar-header">
        <div className="catalog-sidebar-title">
          <SlidersHorizontal size={18} className="sidebar-header-icon" />
          <span>Danh mục sản phẩm</span>
        </div>
      </div>

      <div className="catalog-sidebar-section">
        <div className="catalog-section-label">
          <BookOpen size={14} />
          <span>Thể loại sách</span>
        </div>
        <div className="catalog-category-list" role="listbox" aria-label="Thể loại sách">
          <button
            type="button"
            role="option"
            aria-selected={category === 'all'}
            className={`catalog-category-item${category === 'all' ? ' is-active' : ''}`}
            onClick={() => setCategory('all')}
          >
            <span className="category-name">Tất cả danh mục</span>
            {category === 'all' ? <Check size={14} className="category-check" /> : null}
          </button>
          {categories.map((item) => {
            const isActive = String(category) === String(item.id);
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`catalog-category-item${isActive ? ' is-active' : ''}`}
                onClick={() => setCategory(String(item.id))}
              >
                <span className="category-name">{formatCategoryName(item.name)}</span>
                {isActive ? <Check size={14} className="category-check" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="catalog-sidebar-section">
        <div className="catalog-section-label">
          <ArrowUpDown size={14} />
          <span>Sắp xếp theo</span>
        </div>
        <div className="catalog-sort-list" role="radiogroup" aria-label="Sắp xếp theo">
          {SORT_OPTIONS.map((opt) => {
            const isActive = sort === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={`catalog-sort-item${isActive ? ' is-active' : ''}`}
                onClick={() => setSort?.(opt.value)}
              >
                <span className="sort-radio-indicator" aria-hidden="true" />
                <span className="sort-label">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
