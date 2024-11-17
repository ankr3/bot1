const { SlashCommandBuilder } = require('discord.js');
const updateFamilyEmbed = require('../../utils/updateFamilyEmbed');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('updatefamily')
    .setDescription('Принудительно обновляет список состава семьи'),
  async execute(interaction) {
    // Обновление списка
    try {
      await updateFamilyEmbed(interaction.client);
      await interaction.reply({ content: 'Список состава семьи обновлен.', ephemeral: true });
      console.log('Список состава семьи обновлен по команде');
    } catch (error) {
      console.error('Ошибка при принудительном обновлении списка:', error);
      await interaction.reply({ content: 'Произошла ошибка при обновлении списка.', ephemeral: true });
    }
  }
};
