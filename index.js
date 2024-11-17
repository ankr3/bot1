const { Client, GatewayIntentBits, Collection, Options } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config.json");
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildIntegrations,
  ],
  makeCache: Options.cacheWithLimits({
    GuildMemberManager: { maxSize: 10000 },
  }),
});

client.queues = new Collection();

// Функция для рекурсивного поиска всех файлов с командами
function getFilesRecursively(dirPath, fileList = [], fileExtension = ".js") {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Рекурсивный вызов, если это директория
      getFilesRecursively(filePath, fileList, fileExtension);
    } else if (filePath.endsWith(fileExtension)) {
      // Добавление файла в список, если это нужный тип файла
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Загрузка команд
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = getFilesRecursively(commandsPath);

for (const filePath of commandFiles) {
  const command = require(filePath);
  if (command.data && command.data.name) {
    client.commands.set(command.data.name, command);
  }
}

// Загрузка событий
const eventsPath = path.join(__dirname, "events");
const eventFiles = getFilesRecursively(eventsPath);

for (const filePath of eventFiles) {
  const event = require(filePath);
  if (event.name && typeof event.execute === "function") {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Запуск бота
client.login(process.env.TOKEN);
