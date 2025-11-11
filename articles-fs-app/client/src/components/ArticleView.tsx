import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { deleteAttachment, getArticle, uploadAttachment } from '../api';
import type { Article, Attachment } from '../types';

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isAllowedFile = (file: File) => file.type.startsWith('image/') || file.type === 'application/pdf';

export default function ArticleView() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setError(null);
    getArticle(id)
      .then(setArticle)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!article) return <p>Loading…</p>;

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this article?')) {
      return;
    }
    try {
      const response = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
      if (response.ok) {
        navigate('/');
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || 'Failed to delete the article.');
      }
    } catch (err) {
      alert('Failed to delete the article.');
    }
  };

  const handleAttachmentUpload = async (files: FileList | null) => {
    if (!files || !files.length || !id) return;
    const selected = Array.from(files);
    const invalid = selected.find((file) => !isAllowedFile(file));
    if (invalid) {
      setUploadError('Only image and PDF files are allowed.');
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const results: Attachment[] = [];
      for (const file of selected) {
        const saved = await uploadAttachment(id, file);
        results.push(saved);
      }
      setArticle((current) =>
        current ? { ...current, attachments: [...(current.attachments ?? []), ...results] } : current,
      );
    } catch (e: any) {
      setUploadError(e.message ?? 'Failed to upload attachment');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const attachments = article.attachments ?? [];

  const handleAttachmentDelete = async (attachmentId: string) => {
    if (!id) return;
    setUploadError(null);
    setRemoving((prev) => ({ ...prev, [attachmentId]: true }));
    try {
      await deleteAttachment(id, attachmentId);
      setArticle((current) =>
        current
          ? { ...current, attachments: current.attachments.filter((att) => att.id !== attachmentId) }
          : current,
      );
    } catch (e: any) {
      setUploadError(e.message ?? 'Failed to delete attachment');
    } finally {
      setRemoving((prev) => {
        const next = { ...prev };
        delete next[attachmentId];
        return next;
      });
    }
  };

  return (
    <article className="article">
      <section className="attachments">
        <div className="attachments-header">
          <div>
            <h3>Attachments</h3>
            <p className="meta">
              {attachments.length
                ? `${attachments.length} file${attachments.length > 1 ? 's' : ''}`
                : 'No attachments yet'}
            </p>
          </div>
          <label className="attachment-upload">
            <input
              type="file"
              accept="image/*,application/pdf"
              multiple
              disabled={uploading}
              onChange={(e) => handleAttachmentUpload(e.target.files)}
              ref={fileInputRef}
            />
            <span>{uploading ? 'Uploading…' : 'Add attachment'}</span>
          </label>
        </div>
        {!!attachments.length && (
          <ul className="attachment-list">
            {attachments.map((att) => {
              const removingThis = Boolean(removing[att.id]);
              return (
                <li key={att.id} className="attachment-pill">
                  <div className="attachment-info">
                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                      {att.originalName}
                    </a>
                    <span className="size">{formatBytes(att.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => handleAttachmentDelete(att.id)}
                    disabled={removingThis || uploading}
                  >
                    {removingThis ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {uploadError && <p className="error">{uploadError}</p>}
      </section>

      <h2>{article.title}</h2>
      <div className="meta">
        {new Date(article.createdAt).toLocaleString()}
        {article.updatedAt && (
          <> · Updated {new Date(article.updatedAt).toLocaleString()}</>
        )}
      </div>
      <div className="content" dangerouslySetInnerHTML={{ __html: article.content }} />
      <p>
        <button className="primary" onClick={() => navigate(`/articles/${id}/edit`)} disabled={uploading}>
          Edit
        </button>{' '}
        <button className="primary" onClick={handleDelete} disabled={uploading}>
          Delete
        </button>
      </p>
      <p>
        <Link to="/">← Back to list</Link>
      </p>
    </article>
  );
}
