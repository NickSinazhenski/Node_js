import type { Article, ArticleListItem, Attachment, Workspace, Comment, ArticleVersionSummary } from './types';

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await fetch('/api/workspaces');
  if (!res.ok) throw new Error('Failed to fetch workspaces');
  return res.json();
}

export async function createWorkspace(input: { id?: string; name: string }): Promise<Workspace> {
  const res = await fetch('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to create workspace');
  }
  return res.json();
}

export async function listArticles(workspaceId: string): Promise<ArticleListItem[]> {
  const res = await fetch(`/api/articles?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

export async function getArticle(id: string, version?: number): Promise<Article> {
  const url = version ? `/api/articles/${id}?version=${version}` : `/api/articles/${id}`;
  const res = await fetch(url);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error('Failed to fetch article');
  const payload = await res.json();
  return payload;
}

export async function listArticleVersions(id: string): Promise<ArticleVersionSummary[]> {
  const res = await fetch(`/api/articles/${id}/versions`);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error('Failed to fetch article versions');
  return res.json();
}

export async function createArticle(input: { title: string; content: string; workspaceId: string }): Promise<Article> {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to create article');
  }
  const payload = await res.json();
  return payload;
}

export async function updateArticle(
  id: string,
  input: { title: string; content: string; workspaceId?: string },
): Promise<Article> {
  const res = await fetch(`/api/articles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to update article');
  }
  const payload = await res.json();
  return payload;
}

export async function uploadAttachment(articleId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`/api/articles/${articleId}/attachments`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to upload file');
  }
  return res.json();
}

export async function deleteAttachment(articleId: string, attachmentId: string): Promise<void> {
  const res = await fetch(`/api/articles/${articleId}/attachments/${attachmentId}`, {
    method: 'DELETE',
  });
  if (res.status === 404) {
    throw new Error('Attachment not found');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete attachment');
  }
}

export async function createComment(
  articleId: string,
  input: { author?: string | null; body: string },
): Promise<Comment> {
  const res = await fetch(`/api/articles/${articleId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to add comment');
  }
  return res.json();
}

export async function updateComment(
  articleId: string,
  commentId: string,
  input: { author?: string | null; body: string },
): Promise<Comment> {
  const res = await fetch(`/api/articles/${articleId}/comments/${commentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to update comment');
  }
  return res.json();
}

export async function deleteComment(articleId: string, commentId: string): Promise<void> {
  const res = await fetch(`/api/articles/${articleId}/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (res.status === 404) throw new Error('Comment not found');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete comment');
  }
}
