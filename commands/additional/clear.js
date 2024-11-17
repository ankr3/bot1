const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Удаляет заданное количество сообщений из канала.')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Количество сообщений для удаления')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  async execute(interaction) {
    const count = interaction.options.getInteger('count');

    if (count < 1 || count > 100) {
      return interaction.reply({ content: 'Пожалуйста, введите количество сообщений от 1 до 100.', ephemeral: true });
    }

    // Удаление сообщений
    try {
      await interaction.channel.bulkDelete(count, true);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('Сообщения удалены')
        .setDescription(`Удалено ${count} сообщений.`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error(error);
      return interaction.reply({ content: 'Произошла ошибка при удалении сообщений.', ephemeral: true });
    }
  },
};
