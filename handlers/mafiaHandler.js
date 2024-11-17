const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const {
  updateMainMessage,
  getMainMessageId,
  setMainMessageId,
} = require("../mafia/updateMainMessage");
const config = require("../config.json");
const db = require("../database");

let selectedMode = "classic";
let isBalanceGame = false;
let betAmount = 0;
let players = new Set();
let registrationOpen = true;

async function getUserBalance(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT balance FROM economy WHERE userId = ?",
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.balance : 0); // Возвращает баланс или 0, если запись не найдена
      }
    );
  });
}

module.exports = {
  async handleInteraction(interaction) {
    const { customId } = interaction;

    if (customId === "start_game") {
      if (!isHost(interaction)) {
        return interaction.reply({
          content: "У вас нет прав для начала игры.",
          ephemeral: true,
        });
      }
      await sendModeSelection(interaction);
    }

    if (customId === "cancel_registration") {
      // Проверяем, что пользователь — ведущий
      if (!isHost(interaction)) {
        return interaction.reply({
          content: "У вас нет прав для отмены набора.",
          ephemeral: true,
        });
      }

      // Очищаем список игроков и закрываем набор
      players.clear();
      registrationOpen = false;

      // Сбрасываем основное сообщение в начальное состояние
      await updateMainMessage(interaction.client, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Мафия - Начать игру")
            .setDescription("Нажмите кнопку ниже, чтобы начать игру.")
            .setColor(0x00ff00),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("start_game")
              .setLabel("Начать игру")
              .setStyle(ButtonStyle.Primary)
          ),
        ],
      });

      // Подтверждаем отмену набора
      await interaction.reply({
        content: "Набор на игру отменен.",
        ephemeral: true,
      });
    }

    if (customId === "select_mode") {
      selectedMode = interaction.values[0];
      await interaction.update({
        embeds: [
          new EmbedBuilder()
            .setDescription("Игра на баланс?")
            .setColor(0x00ff00),
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("balance_yes")
              .setLabel("Да")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId("balance_no")
              .setLabel("Нет")
              .setStyle(ButtonStyle.Secondary)
          ),
        ],
      });
    }

    if (customId === "balance_yes" || customId === "balance_no") {
      isBalanceGame = customId === "balance_yes";
      if (isBalanceGame) {
        await showBetAmountModal(interaction);
      } else {
        await startGameSetup(interaction, "Нет");
        await interaction.reply({
          content: "Вы выбрали игру без баланса.",
          ephemeral: true,
        });
      }
    }

    if (customId === "enter_bet") {
      const bet = parseInt(
        interaction.fields.getTextInputValue("bet_amount"),
        10
      );
      if (isNaN(bet) || bet <= 0) {
        return interaction.reply({
          content: "Введите корректную сумму.",
          ephemeral: true,
        });
      }
      betAmount = bet;
      await startGameSetup(interaction, betAmount);
      await interaction.reply({
        content: `Игра с балансом ${betAmount} установлена.`,
        ephemeral: true,
      });
    }

    if (customId === "register") {
      if (isBalanceGame) {
        const userBalance = await getUserBalance(interaction.user.id);

        if (userBalance < betAmount) {
          return interaction.reply({
            content: "У вас недостаточно баланса для регистрации.",
            ephemeral: true,
          });
        }
      }

      if (!players.has(interaction.user.id)) {
        players.add(interaction.user.id);
        await interaction.reply({
          content: "Вы успешно зарегистрировались.",
          ephemeral: true,
        });
      } else {
        players.delete(interaction.user.id);
        await interaction.reply({
          content: "Вы сняли свою регистрацию.",
          ephemeral: true,
        });
      }

      const modeName = await getModeName(selectedMode); // Получаем название текущего режима
      const requiredPlayers = await getRequiredPlayersForMode(selectedMode); // Получаем нужное количество игроков

      await updateMainMessage(
        interaction.client,
        createMainEmbed(
          "Набор открыт",
          modeName,
          requiredPlayers,
          isBalanceGame ? betAmount : "Нет"
        )
      );
    }

    if (customId === "toggle_registration") {
      registrationOpen = !registrationOpen;
      const status = registrationOpen ? "Набор открыт" : "Набор закрыт";
      const modeName = await getModeName(selectedMode); // Получаем название текущего режима

      await updateMainMessage(
        interaction.client,
        createMainEmbed(
          status,
          modeName,
          await getRequiredPlayersForMode(selectedMode),
          isBalanceGame ? betAmount : "Нет"
        )
      );

      await interaction.reply({
        content: `Набор ${registrationOpen ? "открыт" : "закрыт"}.`,
        ephemeral: true,
      });
    }

    if (customId === "confirm_start") {
      const gameStatus = "Игра началась";
      const modeName = await getModeName(selectedMode);
      const modeFile = require(`../mafia/mode/${selectedMode}`);
      await modeFile.start(interaction, Array.from(players), isBalanceGame, betAmount);
      gameActive = true;
      await updateMainMessage(interaction.client, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Мафия - Игра идет")
            .setDescription(
              `Режим: ${selectedMode}\n` +
              `Игра на баланс: ${isBalanceGame ? betAmount : "Нет"}\n` +
              `Зарегистрированные игроки:\n${Array.from(players)
                .map((id) => `<@${id}>`)
                .join("\n")}`
            )
            .setColor(0xff0000), // Цвет можно выбрать на свой вкус
        ],
        components: [], // Убираем кнопки
      });
      await interaction.reply({ content: "Игра началась!", ephemeral: true });
    }
  },
};

// Проверка на ведущего
function isHost(interaction) {
  return (
    interaction.member.roles.cache.has(config.roles.host) ||
    interaction.member.permissions.has("ADMINISTRATOR")
  );
}

// Отправка меню выбора режима
async function sendModeSelection(interaction) {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setDescription("Выберите режим игры:")
        .setColor(0x00ff00),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("select_mode")
          .setPlaceholder("Выберите режим")
          .addOptions([
            { label: "Классический", value: "classic" },
            { label: "Test", value: "test" },
          ])
      ),
    ],
    ephemeral: true,
  });
}

// Показываем окно ввода ставки
async function showBetAmountModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("enter_bet")
    .setTitle("Введите сумму ставки")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("bet_amount")
          .setLabel("Сумма")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

  await interaction.showModal(modal);
}

// Настройка игры и обновление основного сообщения
async function startGameSetup(interaction, balanceInfo) {
  const modeName = await getModeName(selectedMode); // Получаем название режима
  const requiredPlayers = await getRequiredPlayersForMode(selectedMode); // Получаем требуемое количество игроков

  await updateMainMessage(
    interaction.client,
    createMainEmbed("Набор открыт", modeName, requiredPlayers, balanceInfo)
  );
}

// Получение требуемого количества игроков из файла режима
async function getRequiredPlayersForMode(mode) {
  const modeFile = require(`../mafia/mode/${mode}`);
  return modeFile.requiredPlayers || 5; // Если в файле режима не указано, по умолчанию 5
}

async function getModeName(mode) {
  const modeFile = require(`../mafia/mode/${mode}`);
  return modeFile.name || mode; // Если название не указано, используем идентификатор режима
}
// Создание основного сообщения с информацией о состоянии игры
function createMainEmbed(
  status,
  modeName,
  requiredPlayers = 5,
  balanceInfo = isBalanceGame ? betAmount : "Нет"
) {
  const playerList =
    Array.from(players)
      .map((playerId) => `<@${playerId}>`)
      .join("\n") || "Нет зарегистрированных игроков";

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(`Мафия - ${status}`)
        .setDescription(
          `Режим: ${modeName}\nИгра на баланс: ${balanceInfo}\nТребуемое количество игроков: ${requiredPlayers}\nЗарегистрированные игроки:\n${playerList}`
        )
        .setColor(0x00ff00)
        .setTimestamp(),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_start")
          .setLabel("Начать игру")
          .setStyle(ButtonStyle.Success)
          .setDisabled(players.size < requiredPlayers),
        new ButtonBuilder()
          .setCustomId("register")
          .setLabel("Зарегистрироваться")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!registrationOpen),
        new ButtonBuilder()
          .setCustomId("toggle_registration")
          .setLabel(registrationOpen ? "Закрыть набор" : "Открыть набор")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("cancel_registration")
          .setLabel("Отменить набор")
          .setStyle(ButtonStyle.Danger)
      ),
    ],
  };
}
