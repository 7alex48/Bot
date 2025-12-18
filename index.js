console.log('TOKEN LOADED:', !!process.env.DISCORD_TOKEN);

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');

// ================= CONFIG =================
const OWNER_ID = '1254537544322912256';
const COLOR = 0x5865F2;
const TICKET_CATEGORY_NAME = '🎫 Tickets';
const AUTO_CLOSE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ===== in-memory guild config =====
const guildConfig = new Map(); 
// guildId -> { supportRoleId, ticketCategoryId }

// ===== ticket timers =====
const ticketTimers = new Map(); // channelId -> timeout

// ================= HELPERS =================
const errorEmbed = m => new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${m}`);
const okEmbed = m => new EmbedBuilder().setColor(0x57F287).setDescription(`✅ ${m}`);

function cleanName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 80);
}

async function ensureTicketCategory(guild) {
  let cat = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY_NAME
  );
  if (!cat) {
    cat = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory
    });
  }
  return cat;
}

async function userHasTicket(guild, userId) {
  return guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.parent?.name === TICKET_CATEGORY_NAME &&
      c.topic?.includes(`owner:${userId}`)
  );
}

function startAutoClose(channel) {
  if (ticketTimers.has(channel.id)) clearTimeout(ticketTimers.get(channel.id));

  const timer = setTimeout(async () => {
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('⏰ Ticket closed due to inactivity.')
      ]
    });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  }, AUTO_CLOSE_MS);

  ticketTimers.set(channel.id, timer);
}

// ================= SLASH COMMANDS =================
async function deployCommands() {
  const cmds = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Setup ticket system')
      .addChannelOption(o =>
        o.setName('channel').setDescription('Ticket panel channel').setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addRoleOption(o =>
        o.setName('support').setDescription('Support role').setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a user')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(o => o.setName('user').setRequired(true))
      .addStringOption(o => o.setName('reason'))
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Clear messages')
      .addIntegerOption(o =>
        o.setName('amount').setRequired(true).setMinValue(1).setMaxValue(100)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('User info')
      .addUserOption(o => o.setName('user')),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Bot sends a message (owner only)')
      .addStringOption(o => o.setName('text').setRequired(true))
  ];

  await client.application.commands.set(cmds);
}

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {

  // ===== SLASH =====
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // SETUP
    if (commandName === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const role = interaction.options.getRole('support');

      const cat = await ensureTicketCategory(interaction.guild);

      guildConfig.set(interaction.guild.id, {
        supportRoleId: role.id,
        ticketCategoryId: cat.id
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Support Center')
        .setColor(COLOR)
        .setDescription(
          '**Need help or want to buy?**\n\n' +
          'Choose an option below.\n' +
          'Tickets are private and secure.'
        )
        .setFooter({ text: 'Support System' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_buy').setLabel('💳 BUY').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_support').setLabel('🛠️ SUPPORT').setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({ embeds: [okEmbed('Ticket system ready.')], ephemeral: true });
    }

    // ADMIN COMMANDS
    if (['warn', 'kick', 'ban'].includes(commandName)) {
      const user = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (!member) return interaction.reply({ embeds: [errorEmbed('User not found')], ephemeral: true });

      try {
        await user.send({
          embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(
            `${commandName.toUpperCase()} on **${interaction.guild.name}**\nReason: ${reason}`
          )]
        });
      } catch {}

      if (commandName === 'kick') await member.kick(reason);
      if (commandName === 'ban') await member.ban({ reason });

      return interaction.reply({ embeds: [okEmbed(`${commandName} executed.`)] });
    }

    if (commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({ embeds: [okEmbed(`Deleted ${amount} messages.`)], ephemeral: true });
    }

    if (commandName === 'userinfo') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('👤 User Info')
            .addFields(
              { name: 'Tag', value: user.tag, inline: true },
              { name: 'ID', value: user.id, inline: true },
              {
                name: 'Joined',
                value: member?.joinedTimestamp
                  ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                  : 'Unknown',
                inline: true
              }
            )
        ]
      });
    }

    if (commandName === 'say') {
      if (interaction.user.id !== OWNER_ID)
        return interaction.reply({ embeds: [errorEmbed('Owner only')], ephemeral: true });

      await interaction.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(interaction.options.getString('text'))]
      });

      return interaction.reply({ embeds: [okEmbed('Sent')], ephemeral: true });
    }
  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (interaction.customId.startsWith('ticket_')) {
      const cfg = guildConfig.get(interaction.guild.id);
      if (!cfg) return interaction.reply({ embeds: [errorEmbed('System not setup')], ephemeral: true });

      const existing = await userHasTicket(interaction.guild, interaction.user.id);
      if (existing)
        return interaction.reply({ embeds: [errorEmbed(`You already have a ticket: ${existing}`)], ephemeral: true });

      const type = interaction.customId === 'ticket_buy' ? 'buy' : 'support';

      const ch = await interaction.guild.channels.create({
        name: `ticket-${type}-${cleanName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: cfg.ticketCategoryId,
        topic: `owner:${interaction.user.id}`,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
          { id: cfg.supportRoleId, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      startAutoClose(ch);

      await ch.send({
        content: `<@&${cfg.supportRoleId}>`,
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle(type === 'buy' ? '💳 Purchase Ticket' : '🛠️ Support Ticket')
            .setDescription(
              `Hello ${interaction.user},\n\n` +
              'Please explain your request.\n' +
              'This ticket will auto-close after inactivity.'
            )
        ],
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)
          )
        ]
      });

      return interaction.reply({ embeds: [okEmbed(`Ticket created: ${ch}`)], ephemeral: true });
    }

    if (interaction.customId === 'close_ticket') {
      await interaction.reply({ embeds: [okEmbed('Ticket closing...')] });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
});

// reset auto-close on message
client.on('messageCreate', msg => {
  if (
    msg.channel.parent?.name === TICKET_CATEGORY_NAME &&
    ticketTimers.has(msg.channel.id)
  ) {
    startAutoClose(msg.channel);
  }
});

// ================= READY =================
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await deployCommands();
  console.log('✅ Commands deployed');
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
