import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const BOT_TOKEN = process.env.BOT_TOKEN;
const LAND_CLAIM_CHANNEL = process.env.DISCORD_CHANNEL_ID;
const ERROR_CHANNEL = process.env.ERROR_CHANNEL_ID;

client.once("ready", () => console.log(`Logged in as ${client.user.tag}`));

client.on("messageCreate", async (message) => {
  try {
    // Only respond to messages in the land-claim channel
    if (message.channel.id !== LAND_CLAIM_CHANNEL) return;
    
    // Ignore bot messages that are not webhooks
    if (!message.webhookId) return;

    // Skip if thread already exists
    if (message.hasThread) return;

    // Create a thread attached to the webhook message
    await message.startThread({
      name: `Claim • ${message.author.username}`,
      autoArchiveDuration: 1440, // 24h
    });

  } catch (err) {
    console.error("Failed to create thread:", err);
    if (ERROR_CHANNEL) {
      try {
        const errorChannel = await client.channels.fetch(ERROR_CHANNEL);
        await errorChannel.send(`⚠️ Failed to create thread:\n\`\`\`${err}\`\`\``);
      } catch {}
    }
  }
});

client.login(BOT_TOKEN);
