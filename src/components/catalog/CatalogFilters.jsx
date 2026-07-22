import Select from '../ui/Select';

export default function CatalogFilters({ category, setCategory, sort, setSort, categories }) {
  return (
    <div className="filters">
      <Select label="Danh mục" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">Tất cả</option>
        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      <Select label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="relevance">Liên quan</option>
        <option value="title_asc">Tên A-Z</option>
        <option value="sold_desc">Bán chạy</option>
        <option value="price_asc">Giá thấp đến cao</option>
        <option value="price_desc">Giá cao đến thấp</option>
        <option value="rating_desc">Đánh giá</option>
      </Select>
    </div>
  );
}
