const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
require('dotenv').config();

module.exports = async function updateFamilyEmbed(client) {
    const familyChannel = await client.channels.fetch(config.channels.family);
    if (!familyChannel) {
        console.error('Канал состава семьи не найден.');
        return;
    }

    // Получаем или создаем сообщение в канале
    let familyMessage;
    try {
        const messages = await familyChannel.messages.fetch({ limit: 10 });
        familyMessage = messages.find(msg => msg.author.id === client.user.id);
        if (!familyMessage) {
            familyMessage = await familyChannel.send({ embeds: [new EmbedBuilder().setTitle("Загрузка состава семьи...")] });
        }
    } catch (error) {
        console.error('Ошибка при получении сообщения состава:', error);
        return;
    }

    // Получаем гильдию и загружаем всех участников для точного отображения ролей
    const guild = client.guilds.cache.get(process.env.GUILDID);
    if (!guild) {
        console.error('Гильдия не найдена.');
        return;
    }
    await guild.members.fetch(); // Загружаем всех участников в кэш

    // Определяем роли и отделы
    const rolesData = {
        leadership: [
            { title: "Руководящий состав", name: "Да Винчи", roleId: "1285763713428623462" },
            { name: "Салай", roleId: "1285764055558258721" }
        ],
        senior: [
            { title: "Старший состав", name: "Верроккьо", roleId: "1305602385674113035" },
            { name: "Боттичелли", roleId: "1305602443031220295" }
        ],
        main: [
            { title: "Основной состав", name: "Микеланджело", roleId: "1305602518901850252" },
            { name: "Рафаэль", roleId: "1305602578645782569" }
        ],
        academy: [
            { title: "Академия", name: "Ученики", roleId: "1305602649273663528" },
            { name: "Подмастерья", roleId: "1305602681733382205" }
        ]
    };
    const departments = {
        "1305610127801323602": "РЕГ",
        "1305610165684535356": "СПО",
        "1305610239596429405": "ИНТ",
        "1305610264523178015": "КАЗ"
    };

    // Создаем embed-сообщения для каждого состава
    const embeds = [];
    
    // 1-й embed: Состав семьи с timestamp
    const familyEmbed = new EmbedBuilder()
        .setTitle("Состав семьи")
        .setColor(0x0099ff)
        .setTimestamp(); // добавляем timestamp

    embeds.push(familyEmbed);

    // Множество для отслеживания пользователей, которые уже были добавлены
    const addedUsers = new Set();

    // Создаем остальные эмбед-сообщения для каждого состава
    for (const [section, roles] of Object.entries(rolesData)) {
        const embed = new EmbedBuilder()
            .setTitle(roles[0].title)
            .setColor(0x0099ff); // Добавляем только цвет, без timestamp

        for (const roleData of roles) {
            const role = guild.roles.cache.get(roleData.roleId);
            const members = role ? role.members.map(member => {
                // Если пользователь уже добавлен в более высокий раздел, не добавляем его сюда
                if (addedUsers.has(member.id)) {
                    return null; // Возвращаем null, если пользователь уже был добавлен
                }

                // Добавляем пользователя в множество добавленных
                addedUsers.add(member.id);

                const departmentPrefix = Object.keys(departments).find(deptRole => member.roles.cache.has(deptRole));
                return `${departmentPrefix ? `${departments[departmentPrefix]} ` : ''}<@${member.id}>`;
            }).filter(Boolean) : []; // Убираем null значения

            embed.addFields({
                name: roleData.name,
                value: members.length ? members.join('\n') : 'Нет участников',
                inline: false
            });
        }

        embeds.push(embed);
    }

    // Обновляем сообщение
    try {
        await familyMessage.edit({ embeds });
    } catch (error) {
        console.error('Ошибка при обновлении сообщения состава:', error);
    }
};
