import { Sequelize } from 'sequelize';

const DEFAULT_URL = 'postgres://postgres:postgres@localhost:5432/articles_fs';

export const sequelize = new Sequelize(process.env.DATABASE_URL ?? DEFAULT_URL, {
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
});

export const initDb = async () => {
  await sequelize.authenticate();
};
