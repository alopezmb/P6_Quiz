'use strict';

module.exports = {
    up: function (queryInterface, Sequelize) {
        return queryInterface.addColumn(
            'users',
            'bestScore',
            {type: Sequelize.INTEGER,
             defaultValue:0
            }
        );
    },

    down: function (queryInterface, Sequelize) {
        return queryInterface.removeColumn('users', 'bestScore');
    }
};
