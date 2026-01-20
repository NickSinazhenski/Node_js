import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteArticle, listArticles } from '../api';
import type { ArticleListItem } from '../types';
import { useAuth } from '../auth-context';
import { useWorkspace } from '../workspace-context';

export default function ArticleList() {
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentWorkspaceId, loading: wsLoading } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (!currentWorkspaceId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listArticles(currentWorkspaceId)
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentWorkspaceId]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this article?')) return;
    try {
      await deleteArticle(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (wsLoading) return <p>Loading workspaces…</p>;
  if (!currentWorkspaceId) return <p>Select or create a workspace to see articles.</p>;
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
            <div className="meta">{new Date(a.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <Link to={`/articles/${a.id}`} className="ghost">
              Open
            </Link>
            <button
              className="primary"
              onClick={() => handleDelete(a.id)}
              style={{ marginLeft: '8px' }}
              disabled={!(user?.role === 'admin' || (a.createdBy && user?.id === a.createdBy))}
              title={
                user?.role === 'admin' || (a.createdBy && user?.id === a.createdBy)
                  ? undefined
                  : 'Only the creator or an admin can delete'
              }
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
