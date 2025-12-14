console.log('TOKEN:', !!process.env.DISCORD_TOKEN);
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle } = require('discord.js');

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

if (command === 'meme') {
  try {
    const res = await fetch('https://meme-api.com/gimme');
    const data = await res.json();

    const memeEmbed = new EmbedBuilder()
      .setTitle(data.title || 'Random Meme')
      .setColor(COLOR)
      .setImage(data.url)
      .setFooter({
        text: ` ${data.ups || 0} | r/${data.subreddit || 'memes'}`
      });

    return message.channel.send({ embeds: [memeEmbed] });
  } catch (err) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('failed')
      ]
    });
  }
}
  
if (command === 'roblox') {
  const username = args[0];
  if (!username) {
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ Použitie: `!roblox username`')
      ]
    });
  }

  try {
    // 1️⃣ USER INFO
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usernames: [username],
        excludeBannedUsers: false
      })
    });

    const userData = await userRes.json();
    if (!userData.data?.length) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Roblox user nebol nájdený.')
        ]
      });
    }

    const user = userData.data[0];

    // 2️⃣ AVATAR
    const avatarRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=420x420&format=Png`
    );
    const avatarData = await avatarRes.json();
    const avatarUrl = avatarData.data[0]?.imageUrl;

    // 3️⃣ OUTFIT (full body)
    const outfitRes = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=720x720&format=Png`
    );
    const outfitData = await outfitRes.json();
    const outfitUrl = outfitData.data[0]?.imageUrl;

    // 4️⃣ STATUS
    const statusRes = await fetch(
      `https://presence.roblox.com/v1/presence/users`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [user.id] })
      }
    );
    const statusData = await statusRes.json();
    const presence = statusData.userPresences?.[0];

    let statusText = '⚫ Offline';
    if (presence?.userPresenceType === 1) statusText = '🟢 Online';
    if (presence?.userPresenceType === 2)
      statusText = `🎮 In Game (${presence.lastLocation || 'Roblox'})`;

    // 5️⃣ FRIENDS / FOLLOWERS
    const friendsRes = await fetch(
      `https://friends.roblox.com/v1/users/${user.id}/friends/count`
    );
    const followersRes = await fetch(
      `https://friends.roblox.com/v1/users/${user.id}/followers/count`
    );

    const friends = (await friendsRes.json()).count;
    const followers = (await followersRes.json()).count;

    // 6️⃣ EMBED
    const embed = new EmbedBuilder()
      .setTitle(`🎮 Roblox profil – ${user.name}`)
      .setColor(0x00A2FF)
      .setThumbnail(avatarUrl)
      .setImage(outfitUrl)
      .addFields(
        { name: '👤 Username', value: user.name, inline: true },
        { name: '🆔 User ID', value: String(user.id), inline: true },
        {
          name: '📅 Created',
          value: `<t:${Math.floor(new Date(user.created).getTime() / 1000)}:R>`,
          inline: true
        },
        { name: '📡 Status', value: statusText, inline: true },
        { name: '👥 Friends', value: String(friends), inline: true },
        { name: '⭐ Followers', value: String(followers), inline: true }
      )
      .setFooter({ text: 'Roblox API • bestpro bot' });

    // 7️⃣ BUTTONS
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('🔗 Open Profile')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.roblox.com/users/${user.id}/profile`),

      new ButtonBuilder()
        .setLabel('🧢 Inventory')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.roblox.com/users/${user.id}/inventory`),

      new ButtonBuilder()
        .setLabel('🎽 Outfit')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.roblox.com/users/${user.id}/avatar`)
    );

    return message.channel.send({
      embeds: [embed],
      components: [row]
    });

  } catch (err) {
    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription('❌ Chyba pri načítaní Roblox dát.')
      ]
    });
  }
}
  // ===== AVATAR =====
if (command === 'avatar') {
  const target = message.mentions.users.first() || message.author;

  const avatarUrl = target.displayAvatarURL({
    size: 1024,
    extension: 'png',
    forceStatic: false
  });

  return message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`🖼️ Avatar – ${target.tag}`)
        .setColor(COLOR)
        .setImage(avatarUrl)
        .setFooter({ text: 'Klikni pravým → Otvoriť obrázok' })
    ]
  });
}

  
});




client.login(process.env.DISCORD_TOKEN);
