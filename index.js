console.log('TOKEN:', !!process.env.DISCORD_TOKEN);
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const ADMIN_ROLE_ID = '1448769935642853376';
const PREFIX = '!';
const COLOR = 0x5865F2; // Discord blurple

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.once('ready', () => {
  console.log(`✅ Prihlásený ako ${client.user.tag}`);

  client.user.setPresence({
    activities: [{ name: 'bestpro', type: 4 }],
    status: 'online'
  });
});

// ========== HELP EMBED ==========
const helpEmbed = () =>
  new EmbedBuilder()
    .setTitle('📘 Admin príkazy')
    .setColor(COLOR)
    .setDescription(
      `
**!warn @user dôvod**
⚠️ Varovanie

**!kick @user dôvod**
👢 Kick

**!ban @user dôvod**
🔨 Ban

**!clear počet**
🧹 Vymazanie správ

**!say text**
🗣️ Bot pošle správu

**!userinfo @user**
👤 Informácie o userovi
`
    );

// ========== MAIN ==========
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  const isAdmin = message.member?.roles.cache.has(ADMIN_ROLE_ID);

  // ===== HELP =====
  if (command === 'help') {
    return message.reply({ embeds: [helpEmbed()] });
  }

  const adminCommands = ['warn', 'kick', 'ban', 'clear', 'say'];
  if (adminCommands.includes(command) && !isAdmin) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ Nemáš oprávnenie použiť tento príkaz.')
      ]
    });
  }

  // ===== WARN =====
  if (command === 'warn') {
    const target = message.mentions.members.first();
    if (!target)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFAA61A)
            .setDescription('Použitie: `!warn @user dôvod`')
        ]
      });

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    const dmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Varovanie')
      .setColor(0xFAA61A)
      .setDescription(
        `Dostal si varovanie na serveri **${message.guild.name}**\n\n**Dôvod:** ${reason}`
      );

    try {
      await target.send({ embeds: [dmEmbed] });
    } catch {}

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFAA61A)
          .setDescription(`⚠️ **${target.user.tag}** bol varovaný.\n**Dôvod:** ${reason}`)
      ]
    });
  }

  // ===== KICK =====
  if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('Použitie: `!kick @user dôvod`')
        ]
      });

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('👢 Kick')
            .setColor(0xED4245)
            .setDescription(
              `Bol si kicknutý zo servera **${message.guild.name}**\n\n**Dôvod:** ${reason}`
            )
        ]
      });
    } catch {}

    await target.kick(reason);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`👢 **${target.user.tag}** bol kicknutý.\n**Dôvod:** ${reason}`)
      ]
    });
  }

  // ===== BAN =====
  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('Použitie: `!ban @user dôvod`')
        ]
      });

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔨 Ban')
            .setColor(0xED4245)
            .setDescription(
              `Bol si zabanovaný na serveri **${message.guild.name}**\n\n**Dôvod:** ${reason}`
            )
        ]
      });
    } catch {}

    await target.ban({ reason });

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`🔨 **${target.user.tag}** bol zabanovaný.\n**Dôvod:** ${reason}`)
      ]
    });
  }

  // ===== CLEAR =====
  if (command === 'clear') {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFAA61A)
            .setDescription('Použitie: `!clear 1-100`')
        ]
      });

    await message.channel.bulkDelete(amount, true);

    return message.channel
      .send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setDescription(`🧹 Vymazané správy: **${amount}**`)
        ]
      })
      .then(m => setTimeout(() => m.delete(), 3000));
  }

  // ===== SAY =====
  if (command === 'say') {
    const text = args.join(' ');
    if (!text)
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFAA61A)
            .setDescription('Použitie: `!say text`')
        ]
      });

    await message.delete();
    return message.channel.send({
      embeds: [
        new EmbedBuilder().setColor(COLOR).setDescription(text)
      ]
    });
  }

  // ===== USERINFO =====
  if (command === 'userinfo') {
    const user = message.mentions.members.first() || message.member;

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('👤 User info')
          .setColor(COLOR)
          .addFields(
            { name: 'Tag', value: user.user.tag, inline: true },
            { name: 'ID', value: user.id, inline: true },
            {
              name: 'Joined',
              value: `<t:${Math.floor(user.joinedTimestamp / 1000)}:R>`,
              inline: true
            }
          )
      ]
    });
  }
});


if (command === 'rate') {
  const target = message.mentions.members.first() || message.member;

  const percent = Math.floor(Math.random() * 101);

  let verdict = "sprosty kokot";
  if (percent > 80) verdict = 'no da sa';
  else if (percent > 60) verdict = 'mas v tej hlave nieco';
  else if (percent > 40) verdict = 'uz v tej hlave skoro nemas nic';
  else if (percent > 20) verdict = 'vygumovany kar';
  else verdict = 'ty si pekne v piči';

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(' Hodnotenie')
        .setColor(COLOR)
        .setDescription(
          `👤 **${target.user.tag}**\n\n` +
          ` Skóre: **${percent} %**\n` +
          ` Verdikt: *${verdict}*`
        )
        .setFooter({ text: 'Vážna Vec' })
    ]
  });
}

client.login(process.env.DISCORD_TOKEN);
