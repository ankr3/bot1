const famqHandler = require("../../handlers/famqHandler");
const setupTransportHandler = require("../../commands/transport/setup_transport");
const ticketInteractionHandler = require("./ticketInteraction"); // Убедитесь, что путь правильный
const { handlePointAction } = require("../../handlers/pointHandler");
const reportHandler = require("../../handlers/reportHandler"); // Подключаем обработчик отчётов

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    console.log(`Получено взаимодействие: ${interaction.type}`); // Логируем тип взаимодействия

    try {
      // Обработка команд
      if (interaction.isCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
          console.log(`Команда не найдена: ${interaction.commandName}`);
          return;
        }

        console.log(`Выполнение команды: ${interaction.commandName}`);
        await command.execute(interaction, interaction.client); // Передаем client здесь
        return;
      }

      // Обработка кнопок, выпадающих списков и модальных окон
      if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
        console.log(`Взаимодействие: ${interaction.customId}`);

        // Проверяем взаимодействия, связанные с отчётами
        if (
          interaction.customId.startsWith("report_job") || // Кнопка отправки отчёта
          interaction.customId.startsWith("job_selection") || // Выбор работы
          interaction.customId.startsWith("report_modal_") || // Модальное окно отчёта
          interaction.customId.startsWith("approve_report_") || // Одобрение отчёта
          interaction.customId.startsWith("reject_report_") || // Отклонение отчёта
          interaction.customId.startsWith("reject_reason_") // Модальное окно для причины отклонения
        ) {
          await reportHandler.handleInteraction(interaction); // Обработчик отчётов
        } else if (
          interaction.customId.startsWith("addpoints-modal") ||
          interaction.customId.startsWith("removepoints-modal")
        ) {
          await handlePointAction(interaction); // Обработка поинтов
        } else if (
          interaction.customId.startsWith("create_ticket") ||
          interaction.customId.startsWith("close_ticket")
        ) {
          await ticketInteractionHandler.execute(interaction); // Используем обработчик для тикетов
        } else if (
          interaction.customId.startsWith("delete_application_") ||
          interaction.customId.startsWith("open_application_modal") ||
          interaction.customId.startsWith("application_modal")
        ) {
          await famqHandler(interaction); // Обработчик для заявок
        } else {
          await setupTransportHandler.handleInteraction(interaction); // Обработчик транспорта
        }
      }
    } catch (error) {
      console.error(`Ошибка при обработке взаимодействия:`, error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: "Произошла ошибка при обработке вашего действия.",
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "Произошла ошибка при обработке вашего действия.",
          ephemeral: true,
        });
      }
    }
  },
};
