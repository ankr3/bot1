// commands/points/balance.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Показывает ваш текущий баланс поинтов.'),
  async execute(interaction) {
    const userId = interaction.user.id;

    db.get('SELECT balance FROM points WHERE userId = ?', [userId], (err, row) => {
      if (err) {
        console.error(err);
        return interaction.reply({ content: 'Ошибка при получении баланса.', ephemeral: true });
      }

      const balance = row ? row.balance : 0;
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Ваш баланс')
        .setDescription(`Ваш текущий баланс: **${balance}** поинтов.`)
        .setTimestamp();

      interaction.reply({ embeds: [embed], ephemeral: true });
    });
  },
};
