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
const OWNER_ID = '1254537544322912256'; // bot owner
const COLOR = 0x5865F2;
const TICKET_CATEGORY_NAME = '🎫 Tickets';

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

// ===== In-memory guild config =====
const guildConfig = new Map(); 
// guildId -> { supportRoleId, ticketCategoryId }

// ================= HELPERS =================
const errorEmbed = msg =>
  new EmbedBuilder().setColor(0xED4245).setDescription(`❌ ${msg}`);

const successEmbed = msg =>
  new EmbedBuilder().setColor(0x57F287).setDescription(`✅ ${msg}`);

async function ensureTicketCategory(guild) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name === TICKET_CATEGORY_NAME
  );

  if (!category) {
    category = await guild.channels.create({
      name: TICKET_CATEGORY_NAME,
      type: ChannelType.GuildCategory
    });
  }

  return category;
}

function cleanName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 80);
}

async function userHasTicket(guild, userId) {
  return guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.parent?.name === TICKET_CATEGORY_NAME &&
      c.topic?.includes(`owner:${userId}`)
  );
}

// ================= SLASH COMMANDS =================
async function deployCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Setup the ticket system')
      .addChannelOption(o =>
        o.setName('channel')
          .setDescription('Channel for ticket panel')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
      .addRoleOption(o =>
        o.setName('support')
          .setDescription('Support role')
          .setRequired(true)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
      .setName('warn')
      .setDescription('Warn a user')
      .addUserOption(o =>
        o.setName('user').setDescription('User').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('reason').setDescription('Reason').setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName('kick')
      .setDescription('Kick a user')
      .addUserOption(o =>
        o.setName('user').setDescription('User').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('reason').setDescription('Reason').setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
      .setName('ban')
      .setDescription('Ban a user')
      .addUserOption(o =>
        o.setName('user').setDescription('User').setRequired(true)
      )
      .addStringOption(o =>
        o.setName('reason').setDescription('Reason').setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
      .setName('clear')
      .setDescription('Clear messages')
      .addIntegerOption(o =>
        o.setName('amount')
          .setDescription('1-100')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
      .setName('userinfo')
      .setDescription('User information')
      .addUserOption(o =>
        o.setName('user').setDescription('User').setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('say')
      .setDescription('Send message as bot (owner only)')
      .addStringOption(o =>
        o.setName('text').setDescription('Text').setRequired(true)
      )
  ];

  await client.application.commands.set(commands);
}

// ================= INTERACTIONS =================
client.on('interactionCreate', async interaction => {
  // ===== SLASH COMMANDS =====
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    // ===== SETUP =====
    if (commandName === 'setup') {
      const channel = interaction.options.getChannel('channel');
      const supportRole = interaction.options.getRole('support');

      const category = await ensureTicketCategory(interaction.guild);

      guildConfig.set(interaction.guild.id, {
        supportRoleId: supportRole.id,
        ticketCategoryId: category.id
      });

      const embed = new EmbedBuilder()
        .setTitle('🎫 Support Tickets')
        .setColor(COLOR)
        .setDescription(
          'Click the button below to create a support ticket.\n\n' +
          '🔒 Only you and the support team can see it.'
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('create_ticket')
          .setLabel('🎫 Create Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        embeds: [successEmbed('Ticket system has been set up.')],
        ephemeral: true
      });
    }

    // ===== SAY =====
    if (commandName === 'say') {
      if (interaction.user.id !== OWNER_ID) {
        return interaction.reply({
          embeds: [errorEmbed('Only the bot owner can use this command.')],
          ephemeral: true
        });
      }

      const text = interaction.options.getString('text');
      await interaction.channel.send({ embeds: [
        new EmbedBuilder().setColor(COLOR).setDescription(text)
      ]});

      return interaction.reply({ embeds: [successEmbed('Message sent.')], ephemeral: true });
    }

    // ===== USERINFO =====
    if (commandName === 'userinfo') {
      const user = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(user.id);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('👤 User Info')
            .setColor(COLOR)
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

    // ===== CLEAR =====
    if (commandName === 'clear') {
      const amount = interaction.options.getInteger('amount');
      await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({
        embeds: [successEmbed(`Deleted ${amount} messages.`)],
        ephemeral: true
      });
    }

    // ===== WARN / KICK / BAN =====
    if (['warn', 'kick', 'ban'].includes(commandName)) {
      const target = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason';
      const member = await interaction.guild.members.fetch(target.id).catch(() => null);

      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('User not found.')], ephemeral: true });
      }

      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(
                `${commandName.toUpperCase()} on **${interaction.guild.name}**\nReason: ${reason}`
              )
          ]
        });
      } catch {}

      if (commandName === 'kick') await member.kick(reason);
      if (commandName === 'ban') await member.ban({ reason });

      return interaction.reply({
        embeds: [successEmbed(`${commandName.toUpperCase()} executed on ${target.tag}`)]
      });
    }
  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {
    // ===== CREATE TICKET =====
    if (interaction.customId === 'create_ticket') {
      const config = guildConfig.get(interaction.guild.id);
      if (!config) {
        return interaction.reply({ embeds: [errorEmbed('Ticket system not set up.')], ephemeral: true });
      }

      const existing = await userHasTicket(interaction.guild, interaction.user.id);
      if (existing) {
        return interaction.reply({
          embeds: [errorEmbed(`You already have a ticket: ${existing}`)],
          ephemeral: true
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `ticket-${cleanName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId,
        topic: `owner:${interaction.user.id}`,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: ['ViewChannel'] },
          { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] },
          { id: config.supportRoleId, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }
        ]
      });

      const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger)
      );

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(COLOR)
            .setTitle('🎫 Support Ticket')
            .setDescription('Support will be with you shortly.')
        ],
        components: [closeRow]
      });

      return interaction.reply({
        embeds: [successEmbed(`Ticket created: ${channel}`)],
        ephemeral: true
      });
    }

    // ===== CLOSE TICKET =====
    if (interaction.customId === 'close_ticket') {
      await interaction.reply({
        embeds: [successEmbed('Ticket will be closed in 5 seconds.')]
      });

      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
});

// ================= READY =================
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await deployCommands();
  console.log('✅ Slash commands deployed');
});

// ================= LOGIN =================
client.login(process.env.DISCORD_TOKEN);
