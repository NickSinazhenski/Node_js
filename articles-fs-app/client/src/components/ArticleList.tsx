import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listArticles } from '../api';
import type { ArticleListItem } from '../types';
export default function ArticleList() {
const [items, setItems] = useState<ArticleListItem[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
useEffect(() => {
    listArticles()
.then(setItems)
.catch((e) => setError(e.message))
.finally(() => setLoading(false));
}, []);
if (loading) return <p>Loading…</p>;
if (error) return <p className="error">{error}</p>;
if (!items.length) return <p>No articles yet. Create the first one!</p>;
return (
  <ul className="list">
    {items.map((a) => (
      <li key={a.id} className="list-item">
        <div>
          <Link to={`/articles/${a.id}`} className="title">
            {a.title}
          </Link>
          <div className="meta">
            {new Date(a.createdAt).toLocaleString()}
          </div>
        </div>
        <Link to={`/articles/${a.id}`} className="ghost">
          Open →
        </Link>
      </li>
    ))}
  </ul>
);
}