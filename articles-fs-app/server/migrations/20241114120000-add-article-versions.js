'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('article_versions', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      articleId: {
        type: Sequelize.STRING(90),
        allowNull: false,
        references: {
          model: 'articles',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      version: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      workspaceId: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addConstraint('article_versions', {
      fields: ['articleId', 'version'],
      type: 'unique',
      name: 'article_versions_articleId_version_key',
    });

    await queryInterface.addColumn('articles', 'currentVersion', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });

    await queryInterface.sequelize.query(`
      INSERT INTO article_versions ("articleId", version, title, content, "workspaceId", "createdAt", "updatedAt")
      SELECT id, 1, title, content, "workspaceId", COALESCE("updatedAt", "createdAt"), COALESCE("updatedAt", "createdAt")
      FROM articles
      ON CONFLICT ("articleId", version) DO NOTHING;
    `);

    await queryInterface.sequelize.query(`
      UPDATE articles
      SET "currentVersion" = sub.max_version
      FROM (
        SELECT "articleId", MAX(version) AS max_version
        FROM article_versions
        GROUP BY "articleId"
      ) AS sub
      WHERE articles.id = sub."articleId";
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('articles', 'currentVersion');
    await queryInterface.dropTable('article_versions');
  },
};
