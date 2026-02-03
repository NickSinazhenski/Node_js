import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db';
import type { Attachment } from '../types/article';

export class ArticleModel extends Model<
  InferAttributes<ArticleModel, { omit: 'createdAt' | 'updatedAt' }>,
  InferCreationAttributes<ArticleModel, { omit: 'createdAt' | 'updatedAt' }>
> {
  declare id: string;
  declare title: string;
  declare content: string;
  declare workspaceId: string;
  declare attachments: Attachment[];
  declare createdBy: string | null;
  declare currentVersion: CreationOptional<number>;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

ArticleModel.init(
  {
    id: {
      type: DataTypes.STRING(90),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    workspaceId: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    currentVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    sequelize,
    tableName: 'articles',
  },
);

export type ArticleInstance = ArticleModel;
