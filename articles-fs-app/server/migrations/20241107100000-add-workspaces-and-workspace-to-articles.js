'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('workspaces', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(120),
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

    await queryInterface.sequelize.query(
      "INSERT INTO workspaces (id, name, \"createdAt\", \"updatedAt\") VALUES ('default', 'Default Workspace', NOW(), NOW()) ON CONFLICT (id) DO NOTHING;",
    );

    await queryInterface.addColumn('articles', 'workspaceId', {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: 'default',
      references: {
        model: 'workspaces',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('articles', ['workspaceId']);

    await queryInterface.sequelize.query(
      "UPDATE articles SET \"workspaceId\" = 'default' WHERE \"workspaceId\" IS NULL;",
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('articles', 'workspaceId');
    await queryInterface.dropTable('workspaces');
  },
};
