export type Attachment = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type UserRole = 'admin' | 'user';

export type UserSummary = {
  id: string;
  email: string;
  role: UserRole;
};

export type Comment = {
  id: string;
  articleId: string;
  author?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ArticleListItem = {
  id: string;
  title: string;
  createdAt: string;
  workspaceId: string;
  createdBy: string | null;
  version: number;
};

export type Article = ArticleListItem & {
  content: string;
  attachments: Attachment[];
  comments: Comment[];
  createdBy: string | null;
  updatedAt?: string;
  latestVersion: number;
  isLatest: boolean;
};

export type ArticleVersionSummary = {
  version: number;
  title: string;
  workspaceId: string;
  createdAt: string;
};
