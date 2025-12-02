import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { createComment, deleteAttachment, deleteComment, getArticle, updateComment, uploadAttachment } from '../api';
import type { Article, Attachment, Comment } from '../types';
import { useWorkspace } from '../workspace-context';

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingAuthor, setEditingAuthor] = useState('');
  const [editingBody, setEditingBody] = useState('');
  const [removingCommentId, setRemovingCommentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { workspaces } = useWorkspace();

  useEffect(() => {
    if (!id) return;
    setError(null);
    getArticle(id)
      .then((data) => {
        setArticle(data);
        setComments(data.comments ?? []);
        setCommentBody('');
        setCommentAuthor('');
        setCommentError(null);
        setEditingCommentId(null);
      })
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
  const workspaceName = workspaces.find((w) => w.id === article.workspaceId)?.name ?? article.workspaceId;
  const commentList = comments ?? [];

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

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const body = commentBody.trim();
    if (!body) {
      setCommentError('Comment cannot be empty');
      return;
    }
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      const saved = await createComment(id, { author: commentAuthor.trim() || undefined, body });
      setComments((current) => [...current, saved]);
      setCommentBody('');
      setCommentAuthor('');
    } catch (e: any) {
      setCommentError(e.message ?? 'Failed to add comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const startEditing = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingAuthor(comment.author ?? '');
    setEditingBody(comment.body);
    setCommentError(null);
  };

  const handleCommentUpdate = async () => {
    if (!id || !editingCommentId) return;
    const body = editingBody.trim();
    if (!body) {
      setCommentError('Comment cannot be empty');
      return;
    }
    setCommentSubmitting(true);
    try {
      const updated = await updateComment(id, editingCommentId, {
        author: editingAuthor.trim() || undefined,
        body,
      });
      setComments((current) => current.map((c) => (c.id === updated.id ? updated : c)));
      setEditingCommentId(null);
      setEditingAuthor('');
      setEditingBody('');
    } catch (e: any) {
      setCommentError(e.message ?? 'Failed to update comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!id) return;
    setRemovingCommentId(commentId);
    setCommentError(null);
    try {
      await deleteComment(id, commentId);
      setComments((current) => current.filter((c) => c.id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
      }
    } catch (e: any) {
      setCommentError(e.message ?? 'Failed to delete comment');
    } finally {
      setRemovingCommentId(null);
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
        Workspace: {workspaceName} · {new Date(article.createdAt).toLocaleString()}
        {article.updatedAt && <> · Updated {new Date(article.updatedAt).toLocaleString()}</>}
      </div>
      <div className="content" dangerouslySetInnerHTML={{ __html: article.content }} />

      <section className="comments">
        <div className="comments-header">
          <div>
            <h3>Comments</h3>
            <p className="meta">
              {commentList.length ? `${commentList.length} comment${commentList.length > 1 ? 's' : ''}` : 'No comments yet'}
            </p>
          </div>
        </div>
        {!!commentList.length && (
          <ul className="comment-list">
            {commentList.map((c) => {
              const isEditing = editingCommentId === c.id;
              const isRemoving = removingCommentId === c.id;
              return (
                <li key={c.id} className="comment">
                  <div className="comment-meta">
                    <strong>{c.author || 'Anonymous'}</strong>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  {isEditing ? (
                    <div className="comment-edit">
                      <input
                        placeholder="Name (optional)"
                        value={editingAuthor}
                        onChange={(e) => setEditingAuthor(e.target.value)}
                        disabled={commentSubmitting}
                      />
                      <textarea
                        rows={3}
                        value={editingBody}
                        onChange={(e) => setEditingBody(e.target.value)}
                        disabled={commentSubmitting}
                      />
                      <div className="comment-actions">
                        <button
                          className="primary"
                          type="button"
                          onClick={handleCommentUpdate}
                          disabled={commentSubmitting}
                        >
                          {commentSubmitting ? 'Saving…' : 'Save'}
                        </button>
                        <button type="button" onClick={() => setEditingCommentId(null)} disabled={commentSubmitting}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="comment-body">{c.body}</p>
                      <div className="comment-actions">
                        <button type="button" onClick={() => startEditing(c)} disabled={commentSubmitting}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCommentDelete(c.id)}
                          disabled={commentSubmitting || isRemoving}
                        >
                          {isRemoving ? 'Removing…' : 'Delete'}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <div className="comment-row">
            <input
              placeholder="Name (optional)"
              value={commentAuthor}
              onChange={(e) => setCommentAuthor(e.target.value)}
              disabled={commentSubmitting}
            />
          </div>
          <textarea
            rows={3}
            placeholder="Add a comment"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            disabled={commentSubmitting}
          />
          {commentError && <p className="error">{commentError}</p>}
          <button className="primary" type="submit" disabled={commentSubmitting}>
            {commentSubmitting ? 'Saving…' : 'Add comment'}
          </button>
        </form>
      </section>

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
