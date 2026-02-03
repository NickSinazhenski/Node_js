import type {
  Article,
  ArticleListItem,
  Attachment,
  Workspace,
  Comment,
  ArticleVersionSummary,
  UserSummary,
  UserRole,
} from './types';

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    unauthorizedHandler?.();
    throw new Error('Unauthorized');
  }
  return res;
};

export async function register(input: { email: string; password: string }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? 'Failed to register');
  }
  return body as { token: string; user: { id: string; email: string; role: UserRole } };
}

export async function login(input: { email: string; password: string }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? 'Failed to login');
  }
  return body as { token: string; user: { id: string; email: string; role: UserRole } };
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await authFetch('/api/workspaces');
  if (!res.ok) throw new Error('Failed to fetch workspaces');
  return res.json();
}

export async function createWorkspace(input: { id?: string; name: string }): Promise<Workspace> {
  const res = await authFetch('/api/workspaces', {
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
  const res = await authFetch(`/api/articles?workspaceId=${encodeURIComponent(workspaceId)}`);
  if (!res.ok) throw new Error('Failed to fetch articles');
  return res.json();
}

export async function getArticle(id: string, version?: number): Promise<Article> {
  const url = version ? `/api/articles/${id}?version=${version}` : `/api/articles/${id}`;
  const res = await authFetch(url);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error('Failed to fetch article');
  const payload = await res.json();
  return payload;
}

export async function listArticleVersions(id: string): Promise<ArticleVersionSummary[]> {
  const res = await authFetch(`/api/articles/${id}/versions`);
  if (res.status === 404) throw new Error('Not found');
  if (!res.ok) throw new Error('Failed to fetch article versions');
  return res.json();
}

export async function createArticle(input: { title: string; content: string; workspaceId: string }): Promise<Article> {
  const res = await authFetch('/api/articles', {
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
  const res = await authFetch(`/api/articles/${id}`, {
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

export async function deleteArticle(id: string): Promise<void> {
  const res = await authFetch(`/api/articles/${id}`, { method: 'DELETE' });
  if (res.status === 404) {
    throw new Error('Article not found');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete article');
  }
}

export async function uploadAttachment(articleId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await authFetch(`/api/articles/${articleId}/attachments`, {
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
  const res = await authFetch(`/api/articles/${articleId}/attachments/${attachmentId}`, {
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
  const res = await authFetch(`/api/articles/${articleId}/comments`, {
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
  const res = await authFetch(`/api/articles/${articleId}/comments/${commentId}`, {
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
  const res = await authFetch(`/api/articles/${articleId}/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (res.status === 404) throw new Error('Comment not found');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to delete comment');
  }
}

export async function listUsers(): Promise<UserSummary[]> {
  const res = await authFetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserSummary> {
  const res = await authFetch(`/api/users/${userId}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to update role');
  }
  return res.json();
}
