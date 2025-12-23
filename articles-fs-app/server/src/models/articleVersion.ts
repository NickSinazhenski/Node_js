import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db';

export class ArticleVersionModel extends Model<
  InferAttributes<ArticleVersionModel, { omit: 'createdAt' | 'updatedAt' }>,
  InferCreationAttributes<ArticleVersionModel, { omit: 'createdAt' | 'updatedAt' }>
> {
  declare id: CreationOptional<number>;
  declare articleId: string;
  declare version: number;
  declare title: string;
  declare content: string;
  declare workspaceId: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ArticleVersionModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    articleId: {
      type: DataTypes.STRING(90),
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    workspaceId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'article_versions',
    indexes: [
      {
        unique: true,
        fields: ['articleId', 'version'],
      },
    ],
  },
);

export type ArticleVersionInstance = ArticleVersionModel;
