const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;
const useSsl = process.env.PGSSLMODE === 'require' || process.env.DB_SSL === 'true';

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Add it to your environment or .env file.');
}

/** @type {import('sequelize-cli').Config} */
const config = {
  development: {
    url: databaseUrl,
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
