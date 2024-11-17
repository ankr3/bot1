const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addpoints')
    .setDescription('Добавить поинты пользователю.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Пользователь, которому добавить поинты.')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Количество поинтов.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    const modal = new ModalBuilder()
      .setCustomId(`${interaction.commandName}-modal-${target.id}-${amount}`)
      .setTitle('Добавить поинты');

    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setLabel('Причина изменения баланса')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
};
