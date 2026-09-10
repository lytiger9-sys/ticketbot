const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();
const db = require('./db');
const logger = require('./logger');
const { createBackup, getBackups, restoreBackup } = require('./backup');
const {
    saveSetting,
    getSetting,
    deleteSetting,
    saveUserData,
    getUserData,
    deleteUserData,
    getAllUserData,
    deleteAllUserData,
    saveUserMessage,
    getUserMessage,
    deleteUserMessage,
    saveOpenTicket,
    getOpenTicket,
    deleteOpenTicket,
    getAllOpenTickets,
    getUserDataCount
} = require('./utils');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User]
});

const COLORS = {
    '보라색': 0x5865F2,
    '파란색': 0x0099FF,
    '초록색': 0x00FF88,
    '빨간색': 0xFF0000,
    '주황색': 0xFF9900,
    '노란색': 0xFFFF00,
    '분홍색': 0xFF1493,
    '회색': 0x808080
};

async function setChannelPermissions(channel, guildId) {
    try {
        await channel.permissionOverwrites.set([
            { id: channel.guild.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] },
            { id: client.user.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages] }
        ]);
    } catch (e) {
        logger.error('채널 권한 설정 실패', e);
    }
}

client.once('ready', async () => {
    logger.info(`Logged in as ${client.user.tag}`);
    const commands = [
        {
            name: 'setup',
            description: '관리자용 봇 설정 (채널, 질문, 임베드 설정)',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '설정수정',
            description: '기존 설정을 수정합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '정보수집',
            description: '정보 수집 메시지를 게시합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '티켓게시',
            description: '티켓 생성 버튼이 있는 임베드를 게시합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '정보삭제',
            description: '특정 유저의 제출 정보를 삭제합니다.',
            options: [{
                name: 'user',
                description: '삭제할 유저를 선택하세요',
                type: 9,
                required: true
            }],
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '정보전체삭제',
            description: '모든 제출 정보를 삭제합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: 'reset',
            description: '봇의 모든 설정을 초기화합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '설정확인',
            description: '현재 설정된 내용을 확인합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '정보현황',
            description: '제출된 정보 통계를 확인합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        },
        {
            name: '백업',
            description: '데이터베이스를 백업합니다.',
            default_member_permissions: PermissionFlagsBits.Administrator.toString()
        }
    ];
    await client.application.commands.set(commands);
});

client.on('channelDelete', async (channel) => {
    const guildId = channel.guildId;
    const setting = await getSetting(guildId);
    
    if (setting && setting.infoChannelId === channel.id) {
        await deleteSetting(guildId);
        logger.info(`[${guildId}] 정보 수집 채널이 삭제되어 설정이 초기화되었습니다.`);
    }
});

client.on('interactionCreate', async interaction => {
    const guildId = interaction.guildId;

    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'setup') {
                const row = new ActionRowBuilder().addComponents(
                    new ChannelSelectMenuBuilder()
                        .setCustomId('select_info_channel')
                        .setPlaceholder('정보가 전송될 채널을 선택하세요')
                        .addChannelTypes(ChannelType.GuildText)
                );
                const cancelRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('cancel_setup').setLabel('취소').setStyle(ButtonStyle.Danger)
                );
                await interaction.reply({ content: '정보 수집 채널을 선택해주세요.', components: [row, cancelRow], ephemeral: true });
            }

            if (commandName === '설정수정') {
                const setting = await getSetting(guildId);
                if (!setting) {
                    return await interaction.reply({ content: '아직 설정된 내용이 없습니다. `/setup`을 실행해주세요.', ephemeral: true });
                }

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('modify_question_count')
                        .setPlaceholder('질문 개수를 선택하세요')
                        .addOptions(
                            { label: '1개', value: '1' },
                            { label: '2개', value: '2' },
                            { label: '3개', value: '3' },
                            { label: '4개', value: '4' },
                            { label: '5개', value: '5' }
                        )
                );
                const cancelRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('cancel_setup').setLabel('취소').setStyle(ButtonStyle.Danger)
                );
                await interaction.reply({ content: '변경할 질문 개수를 선택해주세요.', components: [row, cancelRow], ephemeral: true });
            }

            if (commandName === '정보수집') {
                const setting = await getSetting(guildId);
                if (!setting) return interaction.reply({ content: '먼저 /setup을 완료해주세요.', ephemeral: true });

                const embedColor = setting.embedColor || 0x5865F2;
                const embed = new EmbedBuilder()
                    .setTitle(setting.embedTitle || '정보 수집 안내')
                    .setDescription(setting.embedDesc || '아래 버튼을 눌러 정보를 제출하거나 확인하세요.')
                    .setColor(embedColor);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('open_info_modal').setLabel('정보 제출/수정').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('view_my_info').setLabel('내 정보 확인').setStyle(ButtonStyle.Secondary)
                );

                await interaction.reply({ embeds: [embed], components: [row] });
                logger.info(`[${guildId}] 정보 수집 메시지 게시됨`);
            }

            if (commandName === '티켓게시') {
                const embed = new EmbedBuilder()
                    .setTitle('고객 지원 티켓')
                    .setDescription('도움이 필요하시면 아래 버튼을 눌러 티켓을 생성하세요.')
                    .setColor(0x0099FF);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('open_ticket').setLabel('티켓 열기').setStyle(ButtonStyle.Primary)
                );

                await interaction.reply({ embeds: [embed], components: [row] });
                logger.info(`[${guildId}] 티켓 게시 메시지 게시됨`);
            }

            if (commandName === '정보삭제') {
                const targetUser = interaction.options.getUser('user');
                const userId = targetUser.id;

                const userData = await getUserData(guildId, userId);
                if (!userData) {
                    return interaction.reply({ content: `${targetUser.tag}의 제출된 정보가 없습니다.`, ephemeral: true });
                }

                try {
                    const setting = await getSetting(guildId);
                    const msgId = await getUserMessage(guildId, userId);
                    
                    if (msgId && setting?.infoChannelId) {
                        try {
                            const infoChannel = await interaction.guild.channels.fetch(setting.infoChannelId);
                            const msg = await infoChannel.messages.fetch(msgId);
                            await msg.delete();
                        } catch (e) {}
                    }

                    await deleteUserData(guildId, userId);
                    await deleteUserMessage(guildId, userId);

                    await interaction.reply({ content: `✅ ${targetUser.tag}의 정보가 삭제되었습니다.`, ephemeral: true });
                    logger.info(`[${guildId}] 유저 ${userId}의 정보 삭제됨`);
                } catch (e) {
                    logger.error(`[${guildId}] 정보 삭제 실패`, e);
                    await interaction.reply({ content: '정보 삭제 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (commandName === '정보전체삭제') {
                try {
                    const setting = await getSetting(guildId);
                    const allUserData = await getAllUserData(guildId);
                    const userCount = allUserData.length;

                    if (userCount === 0) {
                        return await interaction.reply({ content: '삭제할 정보가 없습니다.', ephemeral: true });
                    }

                    if (setting?.infoChannelId) {
                        try {
                            const infoChannel = await interaction.guild.channels.fetch(setting.infoChannelId);
                            for (const userData of allUserData) {
                                try {
                                    const msgId = await getUserMessage(guildId, userData.userId);
                                    if (msgId) {
                                        const msg = await infoChannel.messages.fetch(msgId);
                                        await msg.delete();
                                    }
                                } catch (e) {}
                            }
                        } catch (e) {}
                    }

                    await deleteAllUserData(guildId);

                    await interaction.reply({ content: `✅ ${userCount}명의 정보가 삭제되었습니다.`, ephemeral: true });
                    logger.info(`[${guildId}] 모든 정보 삭제됨 (${userCount}명)`);
                } catch (e) {
                    logger.error(`[${guildId}] 대량 정보 삭제 실패`, e);
                    await interaction.reply({ content: '정보 삭제 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (commandName === 'reset') {
                await deleteSetting(guildId);
                await deleteAllUserData(guildId);
                await interaction.reply({ content: '✅ 모든 설정이 초기화되었습니다.', ephemeral: true });
                logger.info(`[${guildId}] 모든 설정 초기화됨`);
            }

            if (commandName === '설정확인') {
                const setting = await getSetting(guildId);
                if (!setting) {
                    return interaction.reply({ content: '아직 설정된 내용이 없습니다. `/setup`을 실행해주세요.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('현재 설정 확인')
                    .setColor(0x5865F2)
                    .addFields(
                        { name: '임베드 제목', value: setting.embedTitle || '없음', inline: false },
                        { name: '임베드 설명', value: setting.embedDesc || '없음', inline: false },
                        { name: '질문 개수', value: `${setting.questionCount}개`, inline: true },
                        { name: '임베드 색상', value: `#${setting.embedColor?.toString(16).toUpperCase() || '5865F2'}`, inline: true }
                    );

                setting.questions.forEach((q, i) => {
                    embed.addFields({
                        name: `질문 ${i + 1}`,
                        value: `제목: ${q.label}\n예시: ${q.placeholder || '없음'}`,
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (commandName === '정보현황') {
                const userCount = await getUserDataCount(guildId);
                const openTickets = await getAllOpenTickets(guildId);

                const embed = new EmbedBuilder()
                    .setTitle('정보 수집 현황')
                    .setColor(0x00FF88)
                    .addFields(
                        { name: '제출된 정보 수', value: `${userCount}명`, inline: true },
                        { name: '열린 티켓 수', value: `${openTickets.length}개`, inline: true }
                    );

                await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (commandName === '백업') {
                try {
                    await interaction.deferReply({ ephemeral: true });
                    const backupFile = await createBackup();
                    const backups = await getBackups();
                    
                    const embed = new EmbedBuilder()
                        .setTitle('✅ 백업 완료')
                        .setColor(0x00FF00)
                        .addFields(
                            { name: '백업 파일', value: backupFile.split('/').pop(), inline: false },
                            { name: '총 백업 수', value: `${backups.length}개`, inline: true }
                        );

                    await interaction.editReply({ embeds: [embed] });
                    logger.info(`[${guildId}] 데이터베이스 백업 완료`);
                } catch (e) {
                    logger.error(`[${guildId}] 백업 실패`, e);
                    await interaction.editReply({ content: '백업 중 오류가 발생했습니다.' });
                }
            }
        }

        if (interaction.isChannelSelectMenu() && interaction.customId === 'select_info_channel') {
            const infoChannelId = interaction.values[0];
            
            

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_question_count')
                    .setPlaceholder('질문 개수를 선택하세요')
                    .addOptions(
                        { label: '1개', value: '1' },
                        { label: '2개', value: '2' },
                        { label: '3개', value: '3' },
                        { label: '4개', value: '4' },
                        { label: '5개', value: '5' }
                    )
            );
            
            const cancelRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cancel_setup').setLabel('취소').setStyle(ButtonStyle.Danger)
            );
            
            interaction.client.setupData = interaction.client.setupData || {};
            interaction.client.setupData[guildId] = { infoChannelId };
            
            await interaction.reply({ content: '수집할 질문의 개수를 선택해주세요.', components: [row, cancelRow], ephemeral: true });
        }

        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'select_question_count' || interaction.customId === 'modify_question_count') {
                const questionCount = parseInt(interaction.values[0]);
                
                interaction.client.setupData = interaction.client.setupData || {};
                interaction.client.setupData[guildId] = interaction.client.setupData[guildId] || {};
                interaction.client.setupData[guildId].questionCount = questionCount;
                
                const colorRow = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('select_color')
                        .setPlaceholder('임베드 색상을 선택하세요')
                        .addOptions(
                            { label: '보라색', value: '보라색' },
                            { label: '파란색', value: '파란색' },
                            { label: '초록색', value: '초록색' },
                            { label: '빨간색', value: '빨간색' },
                            { label: '주황색', value: '주황색' },
                            { label: '노란색', value: '노란색' },
                            { label: '분홍색', value: '분홍색' },
                            { label: '회색', value: '회색' }
                        )
                );
                
                const cancelRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('cancel_setup').setLabel('취소').setStyle(ButtonStyle.Danger)
                );
                
                await interaction.reply({ content: '임베드 색상을 선택해주세요.', components: [colorRow, cancelRow], ephemeral: true });
            }

            if (interaction.customId === 'select_color') {
                const colorName = interaction.values[0];
                
                interaction.client.setupData = interaction.client.setupData || {};
                interaction.client.setupData[guildId] = interaction.client.setupData[guildId] || {};
                interaction.client.setupData[guildId].embedColor = COLORS[colorName];
                
                // 첫 번째 모달: 제목과 설명만
                const modal = new ModalBuilder().setCustomId('setup_title_desc_modal').setTitle('임베드 설정');
                
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('임베드 제목').setStyle(TextInputStyle.Short).setValue('유저 정보 리포트').setMaxLength(100)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('임베드 내용(설명)').setStyle(TextInputStyle.Paragraph).setValue('유저가 제출한 정보입니다.').setMaxLength(500))
                );
                
                await interaction.showModal(modal).catch(() => interaction.reply({ content: '모달 표시 중 오류가 발생했습니다.', ephemeral: true }));
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'setup_title_desc_modal') {
                try {
                    const setupData = interaction.client.setupData[guildId];
                    const questionCount = setupData.questionCount;
                    
                    const embedTitle = interaction.fields.getTextInputValue('title');
                    const embedDesc = interaction.fields.getTextInputValue('desc');
                    
                    setupData.embedTitle = embedTitle;
                    setupData.embedDesc = embedDesc;
                    
                    // 버튼으로 응답 (모달 체인 대신)
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('proceed_to_questions').setLabel('다음: 질문 설정').setStyle(ButtonStyle.Primary)
                    );
                    
                    await interaction.reply({ content: '✅ 임베드 설정이 완료되었습니다. 다음 버튼을 클릭하여 질문을 설정해주세요.', components: [row], ephemeral: true });
                } catch (e) {
                    logger.error(`[${guildId}] 설정 저장 실패`, e);
                    await interaction.reply({ content: '설정 저장 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'setup_questions_modal') {
                try {
                    const setupData = interaction.client.setupData[guildId];
                    const questionCount = setupData.questionCount;
                    
                    const questions = [];
                    for (let i = 0; i < questionCount; i++) {
                        questions.push({
                            label: interaction.fields.getTextInputValue(`q${i}_label`),
                            placeholder: ''
                        });
                    }
                    
                    setupData.questions = questions;
                    
                    // 미리보기 임베드
                    const previewEmbed = new EmbedBuilder()
                        .setTitle(setupData.embedTitle)
                        .setDescription(setupData.embedDesc)
                        .setColor(setupData.embedColor)
                        .setFooter({ text: '미리보기' });

                    const previewRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm_setup').setLabel('설정 완료').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('cancel_setup').setLabel('취소').setStyle(ButtonStyle.Danger)
                    );
                    
                    await interaction.reply({ content: '설정이 완료되었습니다. 아래는 임베드 미리보기입니다.', embeds: [previewEmbed], components: [previewRow], ephemeral: true });
                } catch (e) {
                    logger.error(`[${guildId}] 질문 저장 실패`, e);
                    await interaction.reply({ content: '설정 저장 중 오류가 발생했습니다.', ephemeral: true });
                }
            }



            if (interaction.customId === 'info_modal') {
                try {
                    const userId = interaction.user.id;
                    const setting = await getSetting(guildId);
                    
                    let hasEmpty = false;
                    setting.questions.forEach((q, i) => {
                        const val = interaction.fields.getTextInputValue(`q_${i}`).trim();
                        if (!val) hasEmpty = true;
                    });

                    if (hasEmpty) {
                        return await interaction.reply({ content: '⚠️ 모든 필드를 입력해주세요.', ephemeral: true });
                    }

                    const infoChannel = await interaction.guild.channels.fetch(setting.infoChannelId);

                    const userData = {};
                    const embedColor = setting.embedColor || 0x00FF00;
                    const embed = new EmbedBuilder()
                        .setTitle(setting.embedTitle)
                        .setDescription(setting.embedDesc)
                        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                        .setColor(embedColor).setTimestamp();

                    setting.questions.forEach((q, i) => {
                        const val = interaction.fields.getTextInputValue(`q_${i}`).trim();
                        userData[`q_${i}`] = val;
                        embed.addFields({ name: q.label, value: val, inline: true });
                    });

                    await saveUserData(guildId, userId, userData);

                    const existingMsgId = await getUserMessage(guildId, userId);

                    if (existingMsgId) {
                        try {
                            const msg = await infoChannel.messages.fetch(existingMsgId);
                            await msg.edit({ embeds: [embed] });
                        } catch (e) {
                            const newMsg = await infoChannel.send({ embeds: [embed] });
                            await saveUserMessage(guildId, userId, newMsg.id);
                        }
                    } else {
                        const newMsg = await infoChannel.send({ embeds: [embed] });
                        await saveUserMessage(guildId, userId, newMsg.id);
                    }
                    
                    await interaction.reply({ content: '정보가 성공적으로 제출/수정되었습니다.', ephemeral: true });
                    logger.info(`[${guildId}] 유저 ${userId}의 정보 제출됨`);
                } catch (e) {
                    logger.error(`[${guildId}] 정보 제출 실패`, e);
                    await interaction.reply({ content: '정보 제출 중 오류가 발생했습니다.', ephemeral: true });
                }
            }
        }

        if (interaction.isButton()) {
            const userId = interaction.user.id;

            if (interaction.customId === 'cancel_setup') {
                delete interaction.client.setupData[guildId];
                await interaction.reply({ content: '설정이 취소되었습니다.', ephemeral: true });
                logger.info(`[${guildId}] 설정 취소됨`);
            }

            if (interaction.customId === 'proceed_to_questions') {
                try {
                    const setupData = interaction.client.setupData[guildId];
                    const questionCount = setupData.questionCount;
                    
                    const questionsModal = new ModalBuilder().setCustomId('setup_questions_modal').setTitle('질문 설정');
                    for (let i = 0; i < questionCount; i++) {
                        questionsModal.addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId(`q${i}_label`).setLabel(`질문 ${i + 1} 제목`).setStyle(TextInputStyle.Short).setPlaceholder(`예: 이름`).setMaxLength(100).setRequired(true))
                        );
                    }
                    await interaction.showModal(questionsModal);
                } catch (e) {
                    logger.error(`[${guildId}] 질문 모달 표시 실패`, e);
                    await interaction.reply({ content: '모달을 표시할 수 없습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'confirm_setup') {
                try {
                    const setupData = interaction.client.setupData[guildId];
                    await saveSetting(guildId, setupData);
                    
                    try {
                        const infoChannel = await interaction.guild.channels.fetch(setupData.infoChannelId);
                        await setChannelPermissions(infoChannel, guildId);
                    } catch (e) {
                        logger.error(`[${guildId}] 채널 권한 설정 실패`, e);
                    }
                    
                    delete interaction.client.setupData[guildId];
                    await interaction.reply({ content: `✅ 설정이 저장되었습니다! (질문 ${setupData.questionCount}개)`, ephemeral: true });
                    logger.info(`[${guildId}] 설정 완료됨 (질문 ${setupData.questionCount}개)`);
                } catch (e) {
                    logger.error(`[${guildId}] 설정 저장 실패`, e);
                    await interaction.reply({ content: '설정 저장 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'open_info_modal') {
                try {
                    const setting = await getSetting(guildId);
                    const modal = new ModalBuilder().setCustomId('info_modal').setTitle(setting.embedTitle);
                    
                    const userData = await getUserData(guildId, userId);
                    
                    setting.questions.forEach((q, i) => {
                        const input = new TextInputBuilder()
                            .setCustomId(`q_${i}`)
                            .setLabel(q.label)
                            .setPlaceholder(q.placeholder || '')
                            .setStyle(TextInputStyle.Short)
                            .setValue(userData?.data?.[`q_${i}`] || '')
                            .setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(input));
                    });
                    
                    await interaction.showModal(modal);
                } catch (e) {
                    logger.error(`[${guildId}] 모달 표시 실패`, e);
                    await interaction.reply({ content: '모달을 표시할 수 없습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'view_my_info') {
                try {
                    const userData = await getUserData(guildId, userId);
                    if (!userData) return interaction.reply({ content: '제출된 정보가 없습니다.', ephemeral: true });

                    const setting = await getSetting(guildId);
                    const embedColor = setting.embedColor || 0x00FFFF;
                    const embed = new EmbedBuilder().setTitle('내 정보 확인').setColor(embedColor);
                    setting.questions.forEach((q, i) => {
                        embed.addFields({ name: q.label, value: userData.data[`q_${i}`] || '없음', inline: true });
                    });
                    await interaction.reply({ embeds: [embed], ephemeral: true });
                } catch (e) {
                    logger.error(`[${guildId}] 정보 조회 실패`, e);
                    await interaction.reply({ content: '정보 조회 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'open_ticket') {
                try {
                    const existingTicketId = await getOpenTicket(guildId, userId);
                    
                    if (existingTicketId) {
                        try {
                            const existingChannel = await interaction.guild.channels.fetch(existingTicketId);
                            return await interaction.reply({ content: `이미 열린 티켓이 있습니다: ${existingChannel}`, ephemeral: true });
                        } catch (e) {
                            await deleteOpenTicket(guildId, userId);
                        }
                    }

                    const channel = await interaction.guild.channels.create({
                        name: `ticket-${interaction.user.username}-${Date.now() % 10000}`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                            { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], deny: [PermissionFlagsBits.ManageChannels] },
                            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                        ]
                    });

                    await saveOpenTicket(guildId, userId, channel.id);

                    const userData = await getUserData(guildId, userId);
let infoEmbed = null;

if (userData) {
    const setting = await getSetting(guildId);

    try {
        const infoChannel = await interaction.guild.channels.fetch(setting.infoChannelId);
        const msgId = await getUserMessage(guildId, userId);

        if (msgId) {
            const msg = await infoChannel.messages.fetch(msgId);
            infoEmbed = EmbedBuilder
                .from(msg.embeds[0])
                .setTitle('📌 유저 정보 (고정됨)');
        }
    } catch (e) {
        logger.error(`[${guildId}] 유저 정보 조회 실패`, e);
    }
}

// 🔽 여기 중요: 정보 있을 때만 send + pin
if (infoEmbed) {
    const pinnedMsg = await channel.send({ embeds: [infoEmbed] });
    await pinnedMsg.pin();
}
                    await channel.send({ 
                        embeds: [new EmbedBuilder().setTitle('문의 접수').setDescription('관리자가 곧 확인하겠습니다.').setColor(0x00FF00)],
                        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('티켓 닫기').setStyle(ButtonStyle.Danger))]
                    });
                    
                    await interaction.reply({ content: `티켓이 생성되었습니다: ${channel}`, ephemeral: true });
                    logger.info(`[${guildId}] 유저 ${userId}의 티켓 생성됨`);
                } catch (e) {
                    logger.error(`[${guildId}] 티켓 생성 실패`, e);
                    await interaction.reply({ content: '티켓 생성 중 오류가 발생했습니다.', ephemeral: true });
                }
            }

            if (interaction.customId === 'close_ticket') {
                try {
                    // 관리자 권한 체크
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ 관리자만 티켓을 닫을 수 있습니다.',
                ephemeral: true
            });
        }
                    const userId = interaction.user.id;
                    await deleteOpenTicket(guildId, userId);
                    await interaction.reply('티켓을 닫습니다. 채널이 10초 후 자동으로 삭제됩니다.');
                    logger.info(`[${guildId}] 유저 ${userId}의 티켓 종료됨`);
                    setTimeout(() => {
                        interaction.channel.delete().catch(e => logger.error(`[${guildId}] 채널 삭제 실패`, e));
                    }, 10000);
                } catch (e) {
                    logger.error(`[${guildId}] 티켓 종료 실패`, e);
                }
            }
        }
    } catch (e) {
        logger.error(`[${guildId}] 상호작용 처리 중 오류`, e);
        try {
            await interaction.reply({ content: '오류가 발생했습니다. 다시 시도해주세요.', ephemeral: true });
        } catch (replyError) {
            logger.error(`[${guildId}] 오류 응답 전송 실패`, replyError);
        }
    }
});

client.login(process.env.TOKEN);
