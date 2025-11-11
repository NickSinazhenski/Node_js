import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArticle } from '../api';
import type { Article } from '../types';
export default function ArticleView() {
const { id } = useParams();
const [article, setArticle] = useState<Article | null>(null);
const [error, setError] = useState<string | null>(null);
const navigate = useNavigate();
useEffect(() => {
if (!id) return;
getArticle(id)
.then(setArticle)
.catch((e) => setError(e.message));
}, [id]);
if (error) return <p className="error">{error}</p>;
if (!article) return <p>Loading…</p>;
const handleDelete = async () => {
  if (!id) return;
  if (window.confirm('Are you sure you want to delete this article?')) {
    try {
      const response = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        navigate('/');
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete the article.');
      }
    } catch (err) {
      alert('Failed to delete the article.');
    }
  }
};
return (
  <article className="article">
    <h2>{article.title}</h2>
    <div className="meta">{new Date(article.createdAt).toLocaleString()}</div>
    <div
      className="content"
      dangerouslySetInnerHTML={{ __html: article.content }}
    />
    <p>
      <button className="primary" onClick={() => navigate(`/articles/${id}/edit`)}>Edit</button>{' '}
      <button className="primary" onClick={handleDelete}>Delete</button>
    </p>
    <p>
      <Link to="/">← Back to list</Link>
    </p>
  </article>
);
}