import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db';

export class CommentModel extends Model<
  InferAttributes<CommentModel, { omit: 'createdAt' | 'updatedAt' }>,
  InferCreationAttributes<CommentModel, { omit: 'createdAt' | 'updatedAt' }>
> {
  declare id: string;
  declare articleId: string;
  declare author: string | null;
  declare body: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

CommentModel.init(
  {
    id: {
      type: DataTypes.STRING(60),
      primaryKey: true,
    },
    articleId: {
      type: DataTypes.STRING(90),
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'comments',
  },
);
