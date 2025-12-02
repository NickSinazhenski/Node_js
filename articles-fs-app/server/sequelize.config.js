const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const DEFAULT_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/articles_fs';
const useSsl = process.env.PGSSLMODE === 'require' || process.env.DB_SSL === 'true';

/** @type {import('sequelize-cli').Config} */
const config = {
  development: {
    url: DEFAULT_URL,
    dialect: 'postgres',
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  },
  // production: {
  //   url: process.env.DATABASE_URL,
  //   dialect: 'postgres',
  //   dialectOptions: useSsl
  //     ? {
  //         ssl: {
  //           require: true,
  //           rejectUnauthorized: false,
  //         },
  //       }
  //     : {},
  // },
};

module.exports = config;
