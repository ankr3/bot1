const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infoa')
        .setDescription('Отправляет информацию о получении поинтов и академии')
        .addChannelOption(option =>
            option
                .setName('канал')
                .setDescription('Выберите канал для отправки сообщения')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),
    async execute(interaction) {
        const targetChannel = interaction.options.getChannel('канал');

        // Первый embed: Получение поинтов
        const pointsEmbed = new EmbedBuilder()
            .setTitle('Получение поинтов:')
            .setColor(0x0099ff)
            .addFields(
                {
                    name: 'Активность внутри семьи',
                    value: `• Мясной день (мясо) - 15 поинтов\n` +
                        `• Грандиозная уборка (мусор) - 20 поинтов\n` +
                        `• Обновляем гардероб (швейка) - 5 поинтов\n` +
                        `• Большой улов - 20 поинтов\n` +
                        `• Ломать-не строить - 10 поинтов\n` +
                        `• Бизвар (Неудачно) - 5 поинтов\n` +
                        `• Бизвар (Удачно) - 10 поинтов\n` +
                        `• Захват Кайо-Перико (Неудачно) - 5 поинтов\n` +
                        `• Захват Кайо-Перико (Удачно) - 10 поинтов\n` +
                        `• За лучшую активность - на усмотрение руководящего состава`,
                    inline: false,
                },
                {
                    name: 'Активность в крайм',
                    value: `• Дроп - 10 поинтов\n` +
                        `• Поезд - 10 поинтов\n` +
                        `• Флаг/Вагонетка - 10 поинтов\n` +
                        `• ГШ - 15 поинтов\n` +
                        `• ВЗХ - 15 поинтов`,
                    inline: false,
                },
                {
                    name: 'Активность в гос',
                    value: `• Перехват поезда - 15 поинтов\n` +
                        `• Перехват ганшопа - 15 поинтов\n` +
                        `• Поставка Маты/Аптеки (Удачно) - 10 поинтов\n` +
                        `• Поставка Анальгетиков (Удачно) - 10 поинтов\n` +
                        `• Поставки любые (Неудачно) - 5 поинтов\n` +
                        `• Дроп (Удачно) - 10 поинтов\n` +
                        `• Дроп (Неудачно) - 5 поинтов\n` +
                        `• Отбитие ФТ/ФЗ - 15 поинтов\n` +
                        `• Рейд (Удачно) - 20 поинтов\n` +
                        `• Рейд (Неудачно) - 5 поинтов\n` +
                        `• Сдача угонки/сутенерки - 5 поинтов`,
                    inline: false,
                }
            );

        // Второй embed: Академия
        const academyEmbed = new EmbedBuilder()
            .setTitle('Академия')
            .setColor(0x0099ff)
            .addFields(
                {
                    name: 'Переход с 1 этапа на 2:',
                    value: '• 75 баллов либо сыграть 10 бизваров',
                    inline: false,
                },
                {
                    name: 'Переход с 2 этапа в основной состав:',
                    value: `• Сыграть 15 бизваров и 500 баллов\n• Сменить фамилию на Mona`,
                    inline: false,
                }
            );

        // Отправка сообщений в выбранный канал
        await targetChannel.send({ embeds: [pointsEmbed, academyEmbed] });

        // Подтверждение выполнения команды
        await interaction.reply({ content: `Сообщение успешно отправлено в канал ${targetChannel}`, ephemeral: true });
    },
};
