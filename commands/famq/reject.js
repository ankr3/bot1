const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reject')
    .setDescription('Отклонить заявку'),
  async execute(interaction) {
    const channel = interaction.channel;

    // Поиск заявки в базе данных
    db.get(`SELECT * FROM applications WHERE channelId = ?`, [channel.id], async (err, row) => {
      if (err || !row) {
        console.error('Ошибка при получении заявки:', err);
        return interaction.reply('Заявка не найдена.');
      }

      // Отправка сообщения в ЛС пользователю
      const user = await interaction.guild.members.fetch(row.userId).catch(() => null);
      if (user) {
        const embed = new EmbedBuilder()
          .setColor(0xDC3545)
          .setTitle('Ваша заявка отклонена')
          .setDescription('Но вы всегда можете попробовать позже.');
        await user.send({ embeds: [embed] });
      }

      // Получение ID канала архива из конфига
      const archiveChannelId = config.channels.archiveChannelId;
      if (!archiveChannelId) {
        return interaction.reply('ID канала архива не найден в конфиге.');
      }

      // Получаем канал архива по ID
      const archiveChannel = await interaction.guild.channels.fetch(archiveChannelId).catch(() => null);
      if (!archiveChannel) {
        return interaction.reply('Не удалось найти канал архива.');
      }

      const archivedEmbed = new EmbedBuilder()
        .setColor(0xDC3545)
        .setTitle(`Отклоненная заявка от ${user.user.username}`)
        .addFields(
          { name: 'Имя фамилия (IC)', value: row.nameSurname },
          { name: 'Ваше имя и возраст (OOC)', value: row.oocInfo },
          { name: 'В каких семьях состояли ранее', value: row.familyHistory },
          { name: 'Ваш средний онлайн и часовой пояс', value: row.onlineTime },
          { name: 'Почему вы хотите вступить к нам?', value: row.familyReason }
        )
        .setFooter({ text: `Заявка отклонена пользователем ${interaction.user.username}` })
        .setTimestamp();

      await archiveChannel.send({ embeds: [archivedEmbed] });

      // Удаление канала
      await channel.delete();

      // Удаление записи из базы данных
      db.run(`DELETE FROM applications WHERE channelId = ?`, [channel.id], (err) => {
        if (err) {
          console.error(err);
        }
      });
    });
  }
};
