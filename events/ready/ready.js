const updateFamilyEmbed = require('../../utils/updateFamilyEmbed');
const updateTransportEmbed = require('../../utils/updateTransportChannel');
const userBalanceManager = require('./userBalanceManager'); // подключаем новый модуль

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        console.log(`Бот вошёл в систему как ${client.user.tag}`);
        
        updateTransportEmbed(client);
        
        setTimeout(() => {
            updateFamilyEmbed(client);
        }, 15000); // 15 секунд

        setInterval(() => {
            updateFamilyEmbed(client);
        }, 10 * 60 * 1000); // 10 минут

        const testServerId = "1285740105843216436";
        const guild = client.guilds.cache.get(testServerId);

        if (guild) {
            try {
                console.log(`Начинаем регистрацию команд на тестовом сервере ${guild.name} (${guild.id})...`);
                
                const commandsArray = client.commands.map((command) => command.data.toJSON());
                await guild.commands.set(commandsArray);

                console.log("Команды успешно зарегистрированы на тестовом сервере.");

                // Инициализация балансов пользователей
                await userBalanceManager.initializeUserBalances(guild);
            } catch (error) {
                console.error("Ошибка при регистрации команд на тестовом сервере:", error);
            }
        } else {
            console.error(`Не удалось найти тестовый сервер с ID ${testServerId}.`);
        }
    },
};
