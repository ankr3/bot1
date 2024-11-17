const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../database');
const config = require('../config.json');

const JOBS = {
    meat: { name: 'Мясной день (мясо)', points: 15 },
    cleaning: { name: 'Грандиозная уборка (мусор)', points: 20 },
    sewing: { name: 'Обновляем гардероб (швейка)', points: 5 },
    fishing: { name: 'Большой улов', points: 20 },
    destruction: { name: 'Ломать-не строить', points: 10 },
    failedBizwar: { name: 'Бизвар (Неудачно)', points: 5 },
    successfulBizwar: { name: 'Бизвар (Удачно)', points: 10 },
    failedHeist: { name: 'Захват Кайо-Перико (Неудачно)', points: 5 },
    successfulHeist: { name: 'Захват Кайо-Перико (Удачно)', points: 10 },
};

module.exports = {
    async handleInteraction(interaction) {
        const logChannel = await interaction.guild.channels.fetch(config.channels.reportslog);

        if (interaction.isButton() && interaction.customId === 'report_job') {
            const jobOptions = Object.entries(JOBS).map(([key, job]) => ({
                label: job.name,
                value: key,
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('job_selection')
                .setPlaceholder('Выберите работу')
                .addOptions(jobOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({ content: 'Выберите работу из списка:', components: [row], ephemeral: true });
        }

        if (interaction.isStringSelectMenu() && interaction.customId === 'job_selection') {
            const selectedJob = JOBS[interaction.values[0]];

            const modal = new ModalBuilder()
                .setCustomId(`report_modal_${interaction.values[0]}`)
                .setTitle('Сдача отчёта');

            const nameField = new TextInputBuilder()
                .setCustomId('name_surname')
                .setLabel('Имя и Фамилия (IC)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const proofField = new TextInputBuilder()
                .setCustomId('proof')
                .setLabel('Доказательства')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameField),
                new ActionRowBuilder().addComponents(proofField)
            );

            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('report_modal_')) {
            const jobKey = interaction.customId.split('_').pop();
            const selectedJob = JOBS[jobKey];

            const nameSurname = interaction.fields.getTextInputValue('name_surname');
            const proof = interaction.fields.getTextInputValue('proof');

            const reportChannel = await interaction.guild.channels.fetch(config.channels.reports);

            const embed = new EmbedBuilder()
                .setTitle('Отчёт')
                .setColor(0x0099ff)
                .addFields(
                    { name: 'От:', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Работа:', value: selectedJob.name, inline: true },
                    { name: 'Имя и Фамилия (IC):', value: nameSurname },
                    { name: 'Доказательства:', value: proof }
                )
                .setTimestamp();

            // Сохраняем отчёт в базу данных
            db.run(
                `INSERT INTO reports (userId, jobKey, nameSurname, proof) VALUES (?, ?, ?, ?)`,
                [interaction.user.id, jobKey, nameSurname, proof],
                function (err) {
                    if (err) {
                        console.error('Ошибка при сохранении отчёта:', err);
                        return interaction.reply({ content: 'Произошла ошибка при отправке отчёта.', ephemeral: true });
                    }

                    const reportId = this.lastID;

                    const approveButton = new ButtonBuilder()
                        .setCustomId(`approve_report_${reportId}`)
                        .setLabel('Одобрить')
                        .setStyle(ButtonStyle.Success);

                    const rejectButton = new ButtonBuilder()
                        .setCustomId(`reject_report_${reportId}`)
                        .setLabel('Отклонить')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(approveButton, rejectButton);

                    reportChannel.send({ embeds: [embed], components: [row] });
                    interaction.reply({ content: 'Ваш отчёт отправлен на рассмотрение.', ephemeral: true });
                }
            );
        }

        if (interaction.isButton() && interaction.customId.startsWith('approve_report_')) {
            const reportId = interaction.customId.split('_').pop();

            db.get(`SELECT * FROM reports WHERE id = ?`, [reportId], async (err, report) => {
                if (err || !report) {
                    console.error('Ошибка при получении отчёта:', err);
                    return interaction.reply({ content: 'Отчёт не найден.', ephemeral: true });
                }

                const user = await interaction.guild.members.fetch(report.userId).catch(() => null);
                if (!user) {
                    console.error(`Пользователь с ID ${report.userId} не найден.`);
                    return interaction.reply({ content: 'Пользователь не найден.', ephemeral: true });
                }

                const points = JOBS[report.jobKey]?.points || 0;

                db.run(`UPDATE points SET balance = balance + ? WHERE userId = ?`, [points, report.userId], async (err) => {
                    if (err) {
                        console.error('Ошибка при обновлении баланса:', err);
                        return interaction.reply({ content: 'Ошибка при начислении поинтов.', ephemeral: true });
                    }

                    db.get(`SELECT balance FROM points WHERE userId = ?`, [report.userId], async (err, row) => {
                        if (err || !row) {
                            console.error('Ошибка при получении баланса:', err);
                            return interaction.reply({ content: 'Ошибка при получении баланса.', ephemeral: true });
                        }

                        const balance = row.balance;

                        const embed = new EmbedBuilder()
                            .setTitle('Ваш отчёт принят')
                            .addFields(
                                { name: 'Работа:', value: JOBS[report.jobKey].name },
                                { name: 'Начислено:', value: `${points} поинтов` },
                                { name: 'Ваш текущий баланс:', value: `${balance} поинтов` }
                            )
                            .setColor(0x28A745);

                        await user.send({ embeds: [embed] });

                        db.run(`UPDATE reports SET status = ? WHERE id = ?`, ['approved', reportId]);

                        const logEmbed = new EmbedBuilder()
                            .setTitle('Лог отчёта')
                            .setColor(0x28A745)
                            .addFields(
                                { name: 'Работа:', value: JOBS[report.jobKey].name },
                                { name: 'Статус:', value: 'Одобрен' },
                                { name: 'Кем одобрено:', value: `<@${interaction.user.id}>` },
                                { name: 'От кого:', value: `<@${report.userId}>` },
                                { name: 'Имя и Фамилия (IC):', value: report.nameSurname },
                                { name: 'Доказательства:', value: report.proof }
                            )
                            .setTimestamp();

                        await logChannel.send({ embeds: [logEmbed] });
                        await interaction.reply({ content: 'Отчёт успешно одобрен.', ephemeral: true });
                        await interaction.message.delete();
                    });
                });
            });
        }

        if (interaction.isButton() && interaction.customId.startsWith('reject_report_')) {
            const reportId = interaction.customId.split('_').pop();

            const modal = new ModalBuilder()
                .setCustomId(`reject_reason_${reportId}`)
                .setTitle('Причина отклонения отчёта');

            const reasonField = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Причина отклонения')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(reasonField));
            await interaction.showModal(modal);
        }

        if (interaction.isModalSubmit() && interaction.customId.startsWith('reject_reason_')) {
            const reportId = interaction.customId.split('_').pop();
            const reason = interaction.fields.getTextInputValue('reason');
        
            db.get(`SELECT * FROM reports WHERE id = ?`, [reportId], async (err, report) => {
                if (err || !report) {
                    console.error('Ошибка при получении отчёта:', err);
                    return interaction.reply({ content: 'Отчёт не найден.', ephemeral: true });
                }
        
                const user = await interaction.guild.members.fetch(report.userId).catch(() => null);
                if (!user) {
                    console.error(`Пользователь с ID ${report.userId} не найден.`);
                    return interaction.reply({ content: 'Пользователь не найден.', ephemeral: true });
                }
        
                db.get(`SELECT balance FROM points WHERE userId = ?`, [report.userId], async (err, row) => {
                    if (err || !row) {
                        console.error('Ошибка при получении баланса:', err);
                        return interaction.reply({ content: 'Ошибка при получении баланса.', ephemeral: true });
                    }
        
                    const balance = row.balance;
        
                    const embed = new EmbedBuilder()
                        .setTitle('Ваш отчёт отклонён')
                        .addFields(
                            { name: 'Причина:', value: reason },
                            { name: 'Ваш текущий баланс:', value: `${balance} поинтов` }
                        )
                        .setColor(0xDC3545);
        
                    await user.send({ embeds: [embed] });
        
                    db.run(`UPDATE reports SET status = ? WHERE id = ?`, ['rejected', reportId]);
        
                    const logEmbed = new EmbedBuilder()
                        .setTitle('Лог отчёта')
                        .setColor(0xDC3545)
                        .addFields(
                            { name: 'Работа:', value: JOBS[report.jobKey].name},
                            { name: 'Статус:', value: 'Отклонён'},
                            { name: 'Кем отклонено:', value: `<@${interaction.user.id}>`, inline: true},
                            { name: 'От кого:', value: `<@${report.userId}>`, inline: true},
                            { name: 'Имя и Фамилия (IC):', value: report.nameSurname },
                            { name: 'Доказательства:', value: report.proof },
                            { name: 'Причина отклонения:', value: reason }
                        )
                        .setTimestamp();
        
                    await logChannel.send({ embeds: [logEmbed] });
                    await interaction.reply({ content: 'Отчёт отклонён.', ephemeral: true });
                    await interaction.message.delete();
                });
            });
        }
    },
};
