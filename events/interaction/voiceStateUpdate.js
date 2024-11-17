// events/voiceStateUpdate.js
const { ChannelType } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const channelId = config.channels.voiceChannelId; // ID голосового канала из конфигурации
        const categoryId = config.categories.voiceCategoryId; // ID категории, в которую будут создаваться новые каналы
        const familyRoleId = config.roles.family; // ID роли семьи

        // Проверяем, что пользователь подключился к голосовому каналу
        if (newState.channelId === channelId && !oldState.channelId) {
            // Создаем новый голосовой канал
            const newChannel = await newState.guild.channels.create({
                name: `Приват-${newState.member.user.username}`,
                type: ChannelType.GuildVoice,
                parent: categoryId, // Устанавливаем категорию
                permissionOverwrites: [
                    {
                        id: newState.guild.id, // Все пользователи
                        deny: ['ViewChannel'], // Запрещаем доступ всем
                    },
                    {
                        id: newState.member.id, // Пользователь, который подключился
                        allow: [
                            'ViewChannel',
                            'Connect',
                            'Speak',
                            'MuteMembers',
                            'DeafenMembers',
                            'MoveMembers',
                            'ManageChannels', // Управление каналом
                        ], // Разрешаем доступ
                    },
                    {
                        id: familyRoleId, // Роль семьи
                        allow: ['ViewChannel', 'Connect', 'Speak'], // Разрешаем доступ для роли семьи
                    },
                ],
            });

            // Переносим пользователя в новый канал
            await newState.setChannel(newChannel);
        }

        // Проверяем, если пользователь отключился от своего голосового канала
        if (oldState.channelId && oldState.channelId !== channelId && newState.channelId === null) {
            // Находим все каналы в гильдии
            const voiceChannels = oldState.guild.channels.cache.filter(channel =>
                channel.type === ChannelType.GuildVoice &&
                channel.name === `Приват-${oldState.member.user.username}`
            );

            // Удаляем канал, если он существует
            voiceChannels.forEach(async (channel) => {
                await channel.delete();
                console.log(`Удалён голосовой канал: ${channel.name}`);
            });
        }
    },
};