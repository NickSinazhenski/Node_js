export type Comment = {
  id: string;
  articleId: string;
  author?: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};
