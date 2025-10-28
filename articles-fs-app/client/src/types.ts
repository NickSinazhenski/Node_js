
export type ArticleListItem = { id: string; title: string; createdAt: string };
export type Article = ArticleListItem & { content: string };