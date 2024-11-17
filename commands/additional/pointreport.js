// commands/points/pointreport.js
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pointreport')
    .setDescription('Отправляет сообщение для создания отчета.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Канал, куда отправить сообщение.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel');

    if (!targetChannel.isTextBased()) {
      return interaction.reply({ content: 'Выберите текстовый канал.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Создание отчета')
      .setDescription('Нажмите кнопку ниже, чтобы создать отчет.')
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId('report_job')
      .setLabel('Создать отчет')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await targetChannel.send({ embeds: [embed], components: [row] });

    interaction.reply({ content: 'Сообщение успешно отправлено!', ephemeral: true });
  },
};
