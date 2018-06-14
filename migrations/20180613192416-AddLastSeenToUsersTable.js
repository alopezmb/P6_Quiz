'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'users',
            'lastSeen',
            {
                type: Sequelize.STRING
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('users', 'bestScore');
    }
};
