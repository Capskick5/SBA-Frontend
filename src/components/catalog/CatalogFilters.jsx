import { useEffect, useState } from 'react';
import Select from '../ui/Select';

export default function CatalogFilters({ query, setQuery, category, setCategory, sort, setSort, categories }) {
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (localQuery !== query) {
        setQuery(localQuery);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [localQuery, query, setQuery]);

  const clearSearch = () => {
    setLocalQuery('');
    if (query) setQuery('');
  };

  return (
    <div className="filters">
      <label className="field search-field">
        <span>Search</span>
        <div className="search-control">
          <input
            value={localQuery}
            placeholder="Search by title or author"
            onChange={(event) => setLocalQuery(event.target.value)}
          />
          {localQuery && (
            <button type="button" onClick={clearSearch} aria-label="Clear search">
              Clear
            </button>
          )}
        </div>
      </label>
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
