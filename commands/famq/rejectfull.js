const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require("discord.js");
const db = require("../../database");
const config = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rejectfull")
    .setDescription("Полностью отклонить заявку"),
  async execute(interaction) {
    const channel = interaction.channel;

    // Поиск заявки в базе данных
    db.get(
      `SELECT * FROM applications WHERE channelId = ?`,
      [channel.id],
      async (err, row) => {
        if (err || !row) {
          console.error("Ошибка при получении заявки:", err);
          return interaction.reply("Заявка не найдена.");
        }

        // Отправка сообщения в ЛС пользователю
        const user = await interaction.guild.members
          .fetch(row.userId)
          .catch(() => null);
        if (user) {
          const embed = new EmbedBuilder()
            .setColor("#DC3545")
            .setTitle("Заявка Отклонена")
            .setDescription(
              `К сожалению, ваша заявка была отклонена. Ты конечно можешь попробовать сноооова. Но пошел нахуй`
            )
            .setImage(
              "https://media1.tenor.com/m/9LdKyZ5g3ikAAAAC/%D0%BE%D1%82%D0%BA%D0%B0%D0%B7%D0%B0%D0%BD%D0%BE.gif"
            )
            .setTimestamp(new Date());
          await user.send({ embeds: [embed] });
        }

        // Получаем канал архива из config.json
        const archiveChannelId = config.channels.archiveChannelId;
        const archiveChannel = await interaction.guild.channels.fetch(archiveChannelId).catch(() => null);

        if (!archiveChannel) {
          return interaction.reply("Канал архива не найден или недоступен.");
        }

        // Формируем embed для архива
        const archivedEmbed = new EmbedBuilder()
          .setColor(0xdc3545)
          .setTitle(`Полностью отклоненная заявка от ${user.user.username}`)
          .addFields(
            { name: "Имя фамилия (IC)", value: row.nameSurname },
            { name: "Ваше имя и возраст (OOC)", value: row.oocInfo },
            { name: "В каких семьях состояли ранее", value: row.familyHistory },
            { name: "Ваш средний онлайн и часовой пояс", value: row.onlineTime },
            { name: "Почему вы хотите вступить к нам?", value: row.familyReason }
          )
          .setFooter({
            text: `Заявка отклонена пользователем ${interaction.user.username}`,
          })
          .setTimestamp();

        // Отправка архива
        await archiveChannel.send({ embeds: [archivedEmbed] });

        // Удаление канала
        await channel.delete();

        // Удаление записи из базы данных
        db.run(
          `DELETE FROM applications WHERE channelId = ?`,
          [channel.id],
          (err) => {
            if (err) {
              console.error(err);
            }
          }
        );
      }
    );
  },
};
