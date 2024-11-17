const { ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
    name: 'ticketInteraction',
    async execute(interaction) {
        if (interaction.customId === 'create_ticket') {
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                parent: config.categories.ticketCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone,
                        deny: ['ViewChannel'],
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages'],
                    },
                    {
                        id: config.roles.ticketManager,
                        allow: ['ViewChannel', 'SendMessages'],
                    },
                ],
            });

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Новый тикет')
                .setDescription(`Тикет создан пользователем <@${interaction.user.id}>`);

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Закрыть тикет')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(closeButton);

            await ticketChannel.send({ embeds: [embed], components: [row] });

            // Отправка сообщения пользователю о создании тикета
            const userEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Ваш тикет создан')
                .setDescription(`Ваш тикет был успешно создан. Нажмите на кнопку ниже, чтобы открыть тикет.`);

            const openTicketButton = new ButtonBuilder()
                .setLabel('Открыть тикет')
                .setURL(ticketChannel.url)
                .setStyle(ButtonStyle.Link);

            const userRow = new ActionRowBuilder().addComponents(openTicketButton);

            await interaction.user.send({ embeds: [userEmbed], components: [userRow] });

            // Логирование создания тикета в лог-канал с указанием, кто открыл тикет
            const logEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('Создан новый тикет')
                .addFields(
                    { name: 'Кто создал тикет', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            const logChannel = await interaction.guild.channels.fetch(config.channels.ticketLog);
            await logChannel.send({ embeds: [logEmbed] });
        } else if (interaction.customId === 'close_ticket') {
            const ticketChannel = interaction.channel;

            // Получение всех сообщений из канала для логирования на Pastebin
            const messages = await ticketChannel.messages.fetch({ limit: 100 });
            const logContent = messages
                .filter(msg => !msg.author.bot)
                .map(msg => `${new Date(msg.createdTimestamp).toLocaleString()} - ${msg.author.username}: ${msg.content}`)
                .reverse()
                .join('\n') || 'No messages sent in the ticket.';

            const pasteResponse = await fetch('https://pastebin.com/api/api_post.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    api_dev_key: process.env.PASTEBIN,
                    api_option: 'paste',
                    api_paste_code: logContent,
                    api_paste_name: `Ticket Logs - ${ticketChannel.name}`,
                    api_paste_private: '1', // Логи доступны только по ссылке
                }),
            });

            const pasteUrl = await pasteResponse.text();

            // Логирование закрытия тикета в лог-канал
            const closeEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Тикет закрыт')
                .addFields(
                    { name: 'Кто создал тикет', value: `<@${interaction.message.embeds[0].description.match(/<@(\d+)>/)[1]}>`, inline: true },
                    { name: 'Кто закрыл тикет', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            const logButton = new ButtonBuilder()
                .setLabel('Посмотреть логи')
                .setURL(pasteUrl)
                .setStyle(ButtonStyle.Link);

            const logRow = new ActionRowBuilder().addComponents(logButton);

            const logChannel = await interaction.guild.channels.fetch(config.channels.ticketLog);
            await logChannel.send({ embeds: [closeEmbed], components: [logRow] });

            // Отправка сообщения пользователю о закрытии тикета
            const userCloseEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('Ваш тикет закрыт')
                .addFields(
                    { name: 'Кто создал тикет', value: `<@${interaction.message.embeds[0].description.match(/<@(\d+)>/)[1]}>`, inline: true },
                    { name: 'Кто закрыл тикет', value: `<@${interaction.user.id}>`, inline: true }
                );

            const userCloseRow = new ActionRowBuilder().addComponents(logButton);

            await interaction.user.send({ embeds: [userCloseEmbed], components: [userCloseRow] });

            // Удаление тикет-канала через 5 секунд
            await ticketChannel.send('Тикет закрыт. Канал будет удален через 5 секунд.');
            setTimeout(() => ticketChannel.delete(), 5000);
        }
    },
};