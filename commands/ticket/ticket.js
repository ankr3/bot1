const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Отправить кнопку для создания тикета'),
    async execute(interaction) {
        // Получаем канал для создания тикетов
        const channel = await interaction.guild.channels.fetch(config.channels.ticketCreationChannel);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket')
                    .setLabel('Создать тикет')
                    .setStyle(ButtonStyle.Primary),
            );

        const embed = {
            color: 0x0099ff,
            title: 'Создание тикета',
            description: 'Нажмите кнопку ниже, чтобы создать новый тикет.',
        };

        await channel.send({ embeds: [embed], components: [row] });

        // Ответ пользователю о том, что кнопка отправлена в указанный канал
        await interaction.reply({ content: 'Кнопка для создания тикета отправлена в канал!', ephemeral: true });
    }
};
