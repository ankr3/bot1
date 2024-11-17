const { SlashCommandBuilder } = require('discord.js');
const handleFamq = require('../../handlers/famqHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('famq')
    .setDescription('Подать заявку в семью'),
  async execute(interaction, client) {
    await handleFamq(interaction, client);
  }
};
