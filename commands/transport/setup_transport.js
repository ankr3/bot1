const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    StringSelectMenuBuilder,
} = require('discord.js');
const db = require('../../database');
const updateTransportEmbed = require('../../utils/updateTransportChannel');
const config = require('../../config.json'); // Убедитесь, что файл содержит правильный ID канала логов

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_transport')
        .setDescription('Настроить систему транспорта'),

    async execute(interaction) {
        // Кнопки для настройки транспорта
        const setupRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('add_transport_button')
                    .setLabel('Добавить транспорт')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('delete_transport_button')
                    .setLabel('Удалить транспорт')
                    .setStyle(ButtonStyle.Danger),
            );

        // Кнопки для работы с транспортом
        const manageRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('list_transport_button')
                    .setLabel('📋 Список автомобилей')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('free_transport_button')
                    .setLabel('🛑 Освободить текущий')
                    .setStyle(ButtonStyle.Danger),
            );

        await interaction.reply({
            content: 'Управление транспортной системой:',
            components: [setupRow],
            ephemeral: true,
        });
    },

    async handleInteraction(interaction) {
        const logChannel = await interaction.client.channels.fetch(config.channels.transportLogs);

        // Работа с кнопками
        if (interaction.isButton()) {
            if (interaction.customId === 'add_transport_button') {
                // Модальное окно для добавления транспорта
                const modal = new ModalBuilder()
                    .setCustomId('add_transport_modal')
                    .setTitle('Добавить транспорт');

                const nameInput = new TextInputBuilder()
                    .setCustomId('transport_name')
                    .setLabel('Название транспорта')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const fuelInput = new TextInputBuilder()
                    .setCustomId('transport_fuel')
                    .setLabel('Топливо (макс. 45 символов)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMaxLength(45);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(nameInput),
                    new ActionRowBuilder().addComponents(fuelInput)
                );

                await interaction.showModal(modal);
            } else if (interaction.customId === 'delete_transport_button') {
                // Модальное окно для удаления транспорта
                const modal = new ModalBuilder()
                    .setCustomId('delete_transport_modal')
                    .setTitle('Удалить транспорт');

                const idInput = new TextInputBuilder()
                    .setCustomId('transport_id')
                    .setLabel('ID транспорта')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            } else if (interaction.customId === 'list_transport_button') {
                // Список автомобилей
                db.all('SELECT * FROM transport', [], async (err, rows) => {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: 'Ошибка при получении списка автомобилей.', ephemeral: true });
                    }

                    const options = rows.map(transport => ({
                        label: `${transport.status === 'Свободна' ? '✅' : '❌'} ${transport.name}`,
                        description: `Статус: ${transport.status}`,
                        value: transport.id.toString(),
                    }));

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_transport')
                        .setPlaceholder('Выберите автомобиль')
                        .addOptions(options);

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    interaction.reply({ content: 'Список автомобилей:', components: [row], ephemeral: true });
                });
            } else if (interaction.customId === 'free_transport_button') {
                // Модальное окно для сдачи автомобиля
                const modal = new ModalBuilder()
                    .setCustomId('free_transport_modal')
                    .setTitle('Сдать автомобиль')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('fuel_amount')
                                .setLabel('Введите остаток топлива')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
        } else if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_transport') {
                // Выбор автомобиля для взятия
                const selectedId = interaction.values[0];
                db.get('SELECT * FROM transport WHERE id = ?', [selectedId], async (err, row) => {
                    if (err || !row) {
                        return interaction.reply({ content: 'Ошибка при обработке выбора автомобиля.', ephemeral: true });
                    }

                    if (row.status !== 'Свободна') {
                        return interaction.reply({ content: 'Этот автомобиль уже занят.', ephemeral: true });
                    }

                    const userId = interaction.user.id;
                    db.get('SELECT * FROM transport WHERE user = ?', [userId], (err, userTransport) => {
                        if (err) {
                            return interaction.reply({ content: 'Ошибка при проверке занятых автомобилей.', ephemeral: true });
                        }

                        if (userTransport) {
                            return interaction.reply({ content: 'Сдайте текущий автомобиль перед взятием нового.', ephemeral: true });
                        }

                        const modal = new ModalBuilder()
                            .setCustomId(`take_transport_modal_${selectedId}`)
                            .setTitle('Взять автомобиль')
                            .addComponents(
                                new ActionRowBuilder().addComponents(
                                    new TextInputBuilder()
                                        .setCustomId('fuel_amount')
                                        .setLabel('Введите количество топлива')
                                        .setStyle(TextInputStyle.Short)
                                        .setRequired(true)
                                )
                            );

                        interaction.showModal(modal);
                    });
                });
            }
        } else if (interaction.isModalSubmit()) {
            // Логика для модальных окон
            if (interaction.customId === 'add_transport_modal') {
                const name = interaction.fields.getTextInputValue('transport_name');
                const fuel = parseInt(interaction.fields.getTextInputValue('transport_fuel'), 10);

                if (isNaN(fuel) || fuel < 0) {
                    return interaction.reply({ content: 'Некорректное значение топлива.', ephemeral: true });
                }

                db.run('INSERT INTO transport (name, fuel, status) VALUES (?, ?, ?)', [name, fuel, 'Свободна'], function (err) {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: 'Ошибка при добавлении транспорта.', ephemeral: true });
                    }

                    updateTransportEmbed(interaction.client);
                    interaction.reply({ content: `Транспорт "${name}" добавлен.`, ephemeral: true });
                });
            } else if (interaction.customId === 'delete_transport_modal') {
                const transportId = parseInt(interaction.fields.getTextInputValue('transport_id'), 10);

                db.run('DELETE FROM transport WHERE id = ?', [transportId], function (err) {
                    if (err) {
                        console.error(err);
                        return interaction.reply({ content: 'Ошибка при удалении транспорта.', ephemeral: true });
                    }

                    updateTransportEmbed(interaction.client);
                    interaction.reply({ content: `Транспорт с ID ${transportId} удалён.`, ephemeral: true });
                });
            } else if (interaction.customId.startsWith('take_transport_modal_')) {
                const transportId = parseInt(interaction.customId.split('_').pop(), 10);
                const fuel = parseInt(interaction.fields.getTextInputValue('fuel_amount'), 10);
                const userId = interaction.user.id;

                db.get('SELECT * FROM transport WHERE id = ?', [transportId], (err, transport) => {
                    if (err || !transport) {
                        return interaction.reply({ content: 'Ошибка при взятии автомобиля.', ephemeral: true });
                    }

                    db.run('UPDATE transport SET status = ?, user = ?, fuel = ? WHERE id = ?', ['Занято', userId, fuel, transportId], async (err) => {
                        if (err) {
                            console.error(err);
                            return interaction.reply({ content: 'Ошибка при обновлении статуса автомобиля.', ephemeral: true });
                        }

                        // Логирование в канал
                        const takeEmbed = new EmbedBuilder()
                            .setColor(0x28A745) // Зеленый цвет
                            .setTitle('Автомобиль занят')
                            .addFields(
                                { name: 'Кем занят:', value: `<@${userId}>`, inline: true },
                                { name: 'Автомобиль:', value: transport.name, inline: true },
                                { name: 'Количество топлива:', value: `${fuel}`, inline: true }
                            )
                            .setTimestamp();

                        await logChannel.send({ embeds: [takeEmbed] });

                        interaction.reply({ content: `Вы взяли транспорт "${transport.name}" с топливом: ${fuel}.`, ephemeral: true });
                        updateTransportEmbed(interaction.client);
                    });
                });
            } else if (interaction.customId === 'free_transport_modal') {
                const fuelAmount = parseInt(interaction.fields.getTextInputValue('fuel_amount'), 10);
                const userId = interaction.user.id;

                if (isNaN(fuelAmount) || fuelAmount < 0) {
                    return interaction.reply({ content: 'Некорректное значение топлива.', ephemeral: true });
                }

                db.get('SELECT * FROM transport WHERE user = ?', [userId], (err, transport) => {
                    if (err || !transport) {
                        return interaction.reply({ content: 'У вас нет автомобиля для сдачи.', ephemeral: true });
                    }

                    db.run('UPDATE transport SET status = ?, user = NULL, fuel = ? WHERE id = ?', ['Свободна', fuelAmount, transport.id], async (err) => {
                        if (err) {
                            console.error(err);
                            return interaction.reply({ content: 'Ошибка при обновлении статуса автомобиля.', ephemeral: true });
                        }

                        // Логирование в канал
                        const logChannel = await interaction.client.channels.fetch(config.channels.transportLogs);
                        const freeEmbed = new EmbedBuilder()
                            .setColor(0xF1C40F) // Желтый цвет
                            .setTitle('Автомобиль освобождён')
                            .addFields(
                                { name: 'Кем освобождён:', value: `<@${userId}>`, inline: true },
                                { name: 'Автомобиль:', value: transport.name, inline: true },
                                { name: 'Остаток топлива:', value: `${fuelAmount}`, inline: true }
                            )
                            .setTimestamp();

                        await logChannel.send({ embeds: [freeEmbed] });

                        interaction.reply({ content: `Вы успешно сдали транспорт "${transport.name}" с остатком топлива: ${fuelAmount}.`, ephemeral: true });
                        updateTransportEmbed(interaction.client);
                    });
                });
            }
        }
    },
};
