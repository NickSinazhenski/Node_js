import { ArticleModel } from './article';
import { CommentModel } from './comment';
import { WorkspaceModel } from './workspace';

ArticleModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace' });
WorkspaceModel.hasMany(ArticleModel, { foreignKey: 'workspaceId', as: 'articles' });

ArticleModel.hasMany(CommentModel, { foreignKey: 'articleId', as: 'comments', onDelete: 'CASCADE', hooks: true });
CommentModel.belongsTo(ArticleModel, { foreignKey: 'articleId', as: 'article' });

export { ArticleModel, CommentModel, WorkspaceModel };
export type { ArticleInstance } from './article';
