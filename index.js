console.log('TOKEN:', !!process.env.DISCORD_TOKEN);
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const ADMIN_ROLE_ID = '1448769935642853376';
const PREFIX = '!';

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
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const isAdmin = message.member?.roles.cache.has(ADMIN_ROLE_ID);

  // ===== HELP =====
  if (command === 'help') {
    return message.reply(
      `📘 **Admin príkazy:**\n` +
      `!warn @user dôvod\n` +
      `!kick @user dôvod\n` +
      `!ban @user dôvod\n` +
      `!clear počet\n` +
      `!say text\n` +
      `!userinfo @user`
    );
  }

  // ===== ADMIN CHECK =====
  const adminCommands = ['warn', 'kick', 'ban', 'clear', 'say'];
  if (adminCommands.includes(command) && !isAdmin) {
    return message.reply('❌ Nemáš oprávnenie použiť tento príkaz.');
  }

  // ===== WARN =====
  if (command === 'warn') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Použitie: `!warn @user dôvod`');

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    try {
      await target.send(
        `⚠️ **Varovanie na serveri ${message.guild.name}**\n📄 Dôvod: ${reason}`
      );
    } catch {}

    return message.channel.send(`⚠️ ${target.user.tag} bol varovaný.\n📄 ${reason}`);
  }

  // ===== KICK =====
  if (command === 'kick') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Použitie: `!kick @user dôvod`');

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    try {
      await target.send(`👢 Bol si kicknutý zo servera **${message.guild.name}**\n📄 ${reason}`);
    } catch {}

    await target.kick(reason);
    return message.channel.send(`👢 ${target.user.tag} bol kicknutý.\n📄 ${reason}`);
  }

  // ===== BAN =====
  if (command === 'ban') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Použitie: `!ban @user dôvod`');

    const reason = args.slice(1).join(' ') || 'Bez dôvodu';

    try {
      await target.send(`🔨 Bol si zabanovaný na **${message.guild.name}**\n📄 ${reason}`);
    } catch {}

    await target.ban({ reason });
    return message.channel.send(`🔨 ${target.user.tag} bol zabanovaný.\n📄 ${reason}`);
  }

  // ===== CLEAR =====
  if (command === 'clear') {
    const amount = parseInt(args[0]);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply('Použitie: `!clear 1-100`');
    }

    await message.channel.bulkDelete(amount, true);
    return message.channel.send(`🧹 Vymazané správy: ${amount}`)
      .then(m => setTimeout(() => m.delete(), 3000));
  }

  // ===== SAY =====
  if (command === 'say') {
    const text = args.join(' ');
    if (!text) return message.reply('Použitie: `!say text`');

    await message.delete();
    return message.channel.send(text);
  }

  // ===== USERINFO =====
  if (command === 'userinfo') {
    const user = message.mentions.members.first() || message.member;

    return message.channel.send(
      `👤 **User info**\n` +
      `Tag: ${user.user.tag}\n` +
      `ID: ${user.id}\n` +
      `Joined: <t:${Math.floor(user.joinedTimestamp / 1000)}:R>`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
