import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from 'sequelize';
import { sequelize } from '../db';

export class UserModel extends Model<
  InferAttributes<UserModel, { omit: 'createdAt' | 'updatedAt' }>,
  InferCreationAttributes<UserModel, { omit: 'createdAt' | 'updatedAt' }>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare passwordHash: string;
  declare readonly createdAt: CreationOptional<Date>;
  declare readonly updatedAt: CreationOptional<Date>;
}

UserModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(160),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
  },
);

export type UserInstance = UserModel;
