import { ArticleModel } from './article';
import { ArticleVersionModel } from './articleVersion';
import { CommentModel } from './comment';
import { WorkspaceModel } from './workspace';

ArticleModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace' });
WorkspaceModel.hasMany(ArticleModel, { foreignKey: 'workspaceId', as: 'articles' });

ArticleModel.hasMany(CommentModel, { foreignKey: 'articleId', as: 'comments', onDelete: 'CASCADE', hooks: true });
CommentModel.belongsTo(ArticleModel, { foreignKey: 'articleId', as: 'article' });

ArticleModel.hasMany(ArticleVersionModel, { foreignKey: 'articleId', as: 'versions', onDelete: 'CASCADE', hooks: true });
ArticleVersionModel.belongsTo(ArticleModel, { foreignKey: 'articleId', as: 'article' });

export { ArticleModel, ArticleVersionModel, CommentModel, WorkspaceModel };
export type { ArticleInstance } from './article';
