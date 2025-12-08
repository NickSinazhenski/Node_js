import { Sequelize } from 'sequelize';

const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.PGSSLMODE === 'require' || process.env.DB_SSL === 'true';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to your environment or .env file.');
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: process.env.DB_LOGGING === 'true' ? console.log : false,
  dialectOptions: useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
});

export const initDb = async () => {
  await sequelize.authenticate();
};
