'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('articles', 'createdBy', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('articles', ['createdBy']);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('articles', ['createdBy']);
    await queryInterface.removeColumn('articles', 'createdBy');
  },
};
