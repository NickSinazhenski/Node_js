import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getArticle } from '../api';
import type { Article } from '../types';
export default function ArticleView() {
const { id } = useParams();
const [article, setArticle] = useState<Article | null>(null);
const [error, setError] = useState<string | null>(null);
useEffect(() => {
if (!id) return;
getArticle(id)
.then(setArticle)
.catch((e) => setError(e.message));
}, [id]);
if (error) return <p className="error">{error}</p>;
if (!article) return <p>Loading…</p>;
return (
  <article className="article">
    <h2>{article.title}</h2>
    <div className="meta">{new Date(article.createdAt).toLocaleString()}</div>
    <div
      className="content"
      dangerouslySetInnerHTML={{ __html: article.content }}
    />
    <p>
      <Link to="/">← Back to list</Link>
    </p>
  </article>
);
}