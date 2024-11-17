const { EmbedBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config.json');

async function handlePointAction(interaction) {
  const { customId, guild, user } = interaction;

  // Разделяем customId, чтобы получить тип действия, ID пользователя и количество поинтов
  const parts = customId.split('-');
  const action = parts[0];
  const targetId = parts[2]; // ID пользователя
  const amount = parseInt(parts[3], 10); // Количество поинтов

  // Проверяем корректность данных
  if (!targetId || isNaN(amount)) {
    console.error('Ошибка в customId: некорректный формат', customId);
    return interaction.reply({ content: 'Ошибка при обработке запроса.', ephemeral: true });
  }

  const reason = interaction.fields.getTextInputValue('reason');
  const isAddAction = action === 'addpoints';

  // Получение текущего баланса
  db.get('SELECT balance FROM points WHERE userId = ?', [targetId], (err, row) => {
    if (err) {
      console.error(err);
      return interaction.reply({ content: 'Ошибка при изменении баланса.', ephemeral: true });
    }

    const currentBalance = row ? row.balance : 0;
    const newBalance = isAddAction
      ? currentBalance + amount
      : Math.max(0, currentBalance - amount); // Не допускаем отрицательный баланс

    // Обновление баланса
    db.run(
      'INSERT INTO points (userId, balance) VALUES (?, ?) ON CONFLICT(userId) DO UPDATE SET balance = ?',
      [targetId, newBalance, newBalance],
      (updateErr) => {
        if (updateErr) {
          console.error(updateErr);
          return interaction.reply({ content: 'Ошибка при обновлении баланса.', ephemeral: true });
        }

        // Отправка уведомления в лог-канал
        const logChannel = guild.channels.cache.get(config.channels.pointLog);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(isAddAction ? 0x00ff00 : 0xff0000)
            .setTitle('Изменение баланса')
            .addFields(
              { name: 'Кому', value: `<@${targetId}>` },
              { name: 'Кто', value: `<@${user.id}>` },
              { name: 'Что сделано', value: `${isAddAction ? 'Добавлено' : 'Забрано'} **${amount}** поинтов.` },
              { name: 'Новый баланс', value: `${newBalance} поинтов` },
              { name: 'Причина', value: reason }
            )
            .setTimestamp();

          logChannel.send({ embeds: [embed] });
        } else {
          console.error('Лог-канал не найден или недоступен.');
        }

        // Уведомление пользователя
        interaction.reply({
          content: `${isAddAction ? 'Добавлено' : 'Забрано'} ${amount} поинтов ${
            isAddAction ? 'пользователю' : 'у пользователя'
          } <@${targetId}>.`,
          ephemeral: true,
        });
      }
    );
  });
}

module.exports = { handlePointAction };
