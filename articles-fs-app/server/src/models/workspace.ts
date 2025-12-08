import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db';

export class WorkspaceModel extends Model<
  InferAttributes<WorkspaceModel, { omit: 'createdAt' | 'updatedAt' }>,
  InferCreationAttributes<WorkspaceModel, { omit: 'createdAt' | 'updatedAt' }>
> {
  declare id: string;
  declare name: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

WorkspaceModel.init(
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'workspaces',
  },
);
