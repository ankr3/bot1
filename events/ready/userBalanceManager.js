const db = require('../../database');

module.exports = {
    async initializeUserBalances(guild) {
        const members = await guild.members.fetch();

        members.forEach(member => {
            db.run(
                `INSERT OR IGNORE INTO points (userId, balance) VALUES (?, 0)`,
                [member.user.id],
                (err) => {
                    if (err) {
                        console.error(`Ошибка при добавлении пользователя ${member.user.tag} в базу данных:`, err);
                    }
                }
            );
        });

        console.log("Проверка пользователей завершена. Все участники имеют записи в таблице points.");
    },

    addNewUser(userId) {
        db.run(
            `INSERT OR IGNORE INTO points (userId, balance) VALUES (?, 0)`,
            [userId],
            (err) => {
                if (err) {
                    console.error(`Ошибка при добавлении нового пользователя в базу данных:`, err);
                } else {
                    console.log(`Новый пользователь с ID ${userId} добавлен в базу данных.`);
                }
            }
        );
    }
};
