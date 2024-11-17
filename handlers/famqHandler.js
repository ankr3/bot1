const { PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, ActionRowBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config.json');

module.exports = async function (interaction) {
    if (interaction.isCommand() && interaction.commandName === 'famq') {
        const channel = await interaction.guild.channels.fetch('1286027066457723002');

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Подать заявку в семью')
            .setDescription('Нажмите на кнопку ниже, чтобы подать заявку.');

        const button = new ButtonBuilder()
            .setCustomId('open_application_modal')
            .setLabel('Заявка')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await channel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: 'Сообщение с кнопкой отправлено в канал!', ephemeral: true });
    } else if (interaction.isButton() && interaction.customId === 'open_application_modal') {
        const modal = new ModalBuilder()
            .setCustomId('application_modal')
            .setTitle('Заявка в семью');

        const nameField = new TextInputBuilder()
            .setCustomId('name_surname')
            .setLabel('Имя и фамилия (IC)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const oocField = new TextInputBuilder()
            .setCustomId('ooc_info')
            .setLabel('Ваше имя и возраст (OOC)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const historyField = new TextInputBuilder()
            .setCustomId('family_history')
            .setLabel('В каких семьях состояли ранее')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false);

        const onlineField = new TextInputBuilder()
            .setCustomId('online_time')
            .setLabel('Ваш средний онлайн')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const reasonField = new TextInputBuilder()
            .setCustomId('family_reason')
            .setLabel('Почему вы хотите вступить в семью?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nameField),
            new ActionRowBuilder().addComponents(oocField),
            new ActionRowBuilder().addComponents(historyField),
            new ActionRowBuilder().addComponents(onlineField),
            new ActionRowBuilder().addComponents(reasonField)
        );

        await interaction.showModal(modal);
    } else if (interaction.isModalSubmit() && interaction.customId === 'application_modal') {
        await interaction.deferReply({ ephemeral: true });

        const nameSurname = interaction.fields.getTextInputValue('name_surname');
        const oocInfo = interaction.fields.getTextInputValue('ooc_info');
        const familyHistory = interaction.fields.getTextInputValue('family_history') || 'Не указано';
        const onlineTime = interaction.fields.getTextInputValue('online_time');
        const familyReason = interaction.fields.getTextInputValue('family_reason');

        const applicationChannel = await interaction.guild.channels.create({
            name: `заявка-${interaction.user.username}`,
            parent: config.categories.applications,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: config.rank.davinci,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: config.rank.salai,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: config.rank.high,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: config.rank.reg,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(`Заявка от ${interaction.user.username}`)
            .addFields(
                { name: 'Имя фамилия (IC)', value: nameSurname },
                { name: 'Ваше имя и возраст (OOC)', value: oocInfo },
                { name: 'В каких семьях состояли ранее', value: familyHistory },
                { name: 'Ваш средний онлайн и часовой пояс', value: onlineTime },
                { name: 'Почему вы хотите вступить к нам?', value: familyReason }
            )
            .setTimestamp();

        await applicationChannel.send({ content: `<@&${config.rank.reg}>`, embeds: [embed] });

        db.run(
            `INSERT INTO applications (userId, channelId, nameSurname, oocInfo, familyHistory, onlineTime, familyReason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [interaction.user.id, applicationChannel.id, nameSurname, oocInfo, familyHistory, onlineTime, familyReason]
        );

        await interaction.followUp({ content: 'Ваша заявка успешно отправлена!', ephemeral: true });
    }
};
