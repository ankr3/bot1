// utils/updateTransportChannel.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database.js');
const config = require('../config.json');

module.exports = async function updateTransportEmbed(client) {
    const transportChannel = await client.channels.fetch(config.channels.transport);
    if (!transportChannel) {
        console.error('Канал транспорта не найден.');
        return;
    }

    db.all('SELECT * FROM transport', [], (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }

        // Проверяем, есть ли транспортные средства
        if (rows.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('Учет авто')
                .setDescription('На данный момент транспорта нету.')
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('list_transport_button')
                        .setLabel('📋 Список автомобилей')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('free_transport_button')
                        .setLabel('🛑 Освободить текущий')
                        .setStyle(ButtonStyle.Danger)
                        .setDisabled(true)
                );

            transportChannel.messages.fetch().then(messages => {
                const transportMessage = messages.find(msg => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === 'Учет авто');
                if (transportMessage) {
                    transportMessage.edit({ embeds: [embed], components: [row] });
                } else {
                    transportChannel.send({ embeds: [embed], components: [row] });
                }
            }).catch(err => {
                console.error('Ошибка при поиске сообщения транспорта:', err);
            });

            return; // Завершаем выполнение функции, если транспорта нет
        }

        // Создаем embed с id и названием машины, а также статусом
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Учет авто')
            .setTimestamp()
            .addFields(rows.map(transport => {
                // Форматирование времени в 24-часовом формате
                const dateOptions = {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false // Отключение 12-часового формата
                };
                const formattedDate = new Date(transport.updatedAt).toLocaleString('ru-RU', dateOptions);

                return {
                    name: `${transport.id}. ${transport.name}`, // id машины и её название
                    value: transport.status === 'Свободна' ? '✅ Свободно' : `❌ Занято ${formattedDate}\nКем занято: <@${transport.user}>`
                };
            }));

        const listButton = new ButtonBuilder()
            .setCustomId('list_transport_button')
            .setLabel('📋 Список автомобилей')
            .setStyle(ButtonStyle.Primary);

        const freeButton = new ButtonBuilder()
            .setCustomId('free_transport_button')
            .setLabel('🛑 Освободить текущий')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(listButton, freeButton);

        transportChannel.messages.fetch().then(messages => {
            const transportMessage = messages.find(msg => msg.author.id === client.user.id && msg.embeds.length > 0 && msg.embeds[0].title === 'Учет авто');
            if (transportMessage) {
                transportMessage.edit({ embeds: [embed], components: [row] });
            } else {
                transportChannel.send({ embeds: [embed], components: [row] });
            }
        }).catch(err => {
            console.error('Ошибка при поиске сообщения транспорта:', err);
        });
    });
};