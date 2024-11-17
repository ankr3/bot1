const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../../database.js');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('accept')
    .setDescription('Принять заявку'),
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
          .setColor(0x28A745)
          .setTitle('Ваша заявка принята')
          .setDescription('Для инвайта вас в семью свяжитесь с кем-то из старшего состава.');
        await user.send({ embeds: [embed] });
      }

      // Выдача роли семьи
      const rolesToAdd = [
        config.rank.mona,
        config.rank.academy,
        config.rank.journeyman,
    ];
    
    for (const roleId of rolesToAdd) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
            try {
                await user.roles.add(role);
            } catch (error) {
                console.error(`Не удалось добавить роль ${role.name} пользователю ${user.tag}:`, error);
            }
        } else {
            console.warn(`Роль с ID ${roleId} не найдена на сервере.`);
        }
    }
    

      // Перенос анкеты в архив, используя id канала из конфигурации
      try {
        const archiveChannel = await interaction.guild.channels.fetch(config.channels.archiveChannelId); // Получаем канал по id

        const archivedEmbed = new EmbedBuilder()
          .setColor(0x28A745)
          .setTitle(`Принятая заявка от ${user.user.username}`)
          .addFields(
            { name: 'Имя фамилия (IC)', value: row.nameSurname },
            { name: 'Ваше имя и возраст (OOC)', value: row.oocInfo },
            { name: 'В каких семьях состояли ранее', value: row.familyHistory },
            { name: 'Ваш средний онлайн и часовой пояс', value: row.onlineTime },
            { name: 'Почему вы хотите вступить к нам?', value: row.familyReason }
          )
          .setFooter({ text: `Заявка принята пользователем ${interaction.user.username}` })
          .setTimestamp();

        await archiveChannel.send({ embeds: [archivedEmbed] });
      } catch (error) {
        console.error('Ошибка при отправке анкеты в архив:', error);
        return interaction.reply('Не удалось отправить анкету в архив.');
      }

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
