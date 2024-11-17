const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infoacademy')
        .setDescription('Отправляет информацию о получении поинтов и академии'),
    async execute(interaction) {
        // Создаем первый embed с контрактами и другими активностями
        const pointsEmbed = new EmbedBuilder()
            .setTitle('Получение поинтов:')
            .setColor(0x0099ff)
            .addFields(
                {
                    name: 'Контракты:',
                    value: `• Мясной день (мясо) - 15 поинтов\n` +
                        `• Грандиозная уборка (мусор) - 20 поинтов\n` +
                        `• Обновляем гардероб (швейка) - 5 поинтов\n` +
                        `• Большой улов - 30 поинтов\n` +
                        `• Ломать-не строить - 30 поинтов`,
                    inline: false
                },
                {
                    name: 'Другое:',
                    value: `• Бизвар (Неудачно) - 5 поинтов\n` +
                        `• Бизвар (Удачно) - 10 поинтов\n` +
                        `• Захват Кайо-Перико (Неудачно) - 5 поинтов\n` +
                        `• Захват Кайо-Перико (Удачно) - 10 поинтов\n` +
                        `• За лучшую активность - на усмотрение руководящего состава`,
                    inline: false
                }
            );

        // Создаем второй embed с академией
        const academyEmbed = new EmbedBuilder()
            .setTitle('Академия')
            .setColor(0x0099ff)
            .addFields(
                {
                    name: 'Переход с 1 этапа на 2:',
                    value: '• 75 баллов либо сыграть 10 бизваров',
                    inline: false
                },
                {
                    name: 'Переход с 2 этапа в основной состав:',
                    value: '• Сыграть 15 бизваров и 250 баллов\n• Сменить фамилию на Mona',
                    inline: false
                }
            );

        // Отправляем оба embed-сообщения
        await interaction.reply({
            embeds: [pointsEmbed, academyEmbed]
        });
    }
};
