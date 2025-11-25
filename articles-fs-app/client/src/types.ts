export type Attachment = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type ArticleListItem = { id: string; title: string; createdAt: string };
export type Article = ArticleListItem & { content: string; attachments: Attachment[]; updatedAt?: string };
