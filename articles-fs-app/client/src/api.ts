import type { Article, ArticleListItem } from './types';

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