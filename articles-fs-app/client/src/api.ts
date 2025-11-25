import type { Article, ArticleListItem, Attachment } from './types';

export async function listArticles(): Promise<ArticleListItem[]> {
  const res = await fetch('/api/articles');
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

export async function getArticle(id: string): Promise<Article> {
  const res = await fetch(`/api/articles/${id}`);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error('Failed to fetch article');
  return res.json();
}

export async function createArticle(input: { title: string; content: string }): Promise<Article> {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to create article');
  }
  return res.json();
}

export async function updateArticle(id: string, input: { title: string; content: string }): Promise<Article> {
  const res = await fetch(`/api/articles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to update article');
  }
  return res.json();
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
