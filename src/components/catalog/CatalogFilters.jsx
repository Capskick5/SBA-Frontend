import Select from '../ui/Select';

export default function CatalogFilters({ category, setCategory, sort, setSort, categories }) {
  return (
    <div className="filters">
      <Select label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">All</option>
        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      <Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="title_asc">Title A-Z</option>
        <option value="price_asc">Price low to high</option>
        <option value="price_desc">Price high to low</option>
        <option value="rating_desc">Rating</option>
      </Select>
    </div>
  );
}
