// commands/points/balanceuser.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balanceuser')
    .setDescription('Показывает баланс указанного пользователя.')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Пользователь, чей баланс вы хотите проверить.')
        .setRequired(true)
    ),
  async execute(interaction) {
    const target = interaction.options.getUser('target');

    db.get('SELECT balance FROM points WHERE userId = ?', [target.id], (err, row) => {
      if (err) {
        console.error(err);
        return interaction.reply({ content: 'Ошибка при получении баланса.', ephemeral: true });
      }

      const balance = row ? row.balance : 0;
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(`Баланс пользователя ${target.username}`)
        .setDescription(`Текущий баланс: **${balance}** поинтов.`)
        .setTimestamp();

      interaction.reply({ embeds: [embed], ephemeral: true });
    });
  },
};
