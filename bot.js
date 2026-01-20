import { Client, GatewayIntentBits } from "discord.js";
import express from "express";

// -------------------
// Tiny HTTP server for Render free tier
// -------------------
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// -------------------
// Discord Bot Setup
// -------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const BOT_TOKEN = process.env.BOT_TOKEN; // Discord bot token
const LAND_CLAIM_CHANNEL = process.env.LAND_CLAIM_CHANNEL; // Channel ID for land-claim
const ERROR_CHANNEL = process.env.ERROR_CHANNEL; // Channel ID for error logging

client.once("ready", () =>
  console.log(`Logged in as ${client.user.tag} and watching land-claim channel`)
);

// Watch for webhook messages in the land-claim channel
client.on("messageCreate", async (message) => {
  try {
    if (message.channel.id !== LAND_CLAIM_CHANNEL) return;
    if (!message.webhookId) return; // Only react to webhook posts
    if (message.hasThread) return;   // Skip if thread already exists

    // Create a thread attached to the webhook message
    const threadName = message.embeds[0]?.title
      ? message.embeds[0].title.replace("Submission by: | ", "")
      : `Claim • ${message.author.username}`;

    await message.startThread({
      name: threadName,
      autoArchiveDuration: 1440, // 24 hours
    });

  } catch (err) {
    console.error("Failed to create thread:", err);
    if (ERROR_CHANNEL) {
      try {
        const errorChannel = await client.channels.fetch(ERROR_CHANNEL);
        await errorChannel.send(
          `⚠️ Failed to create thread:\n\`\`\`${err}\`\`\``
        );
      } catch {}
    }
  }
});

// Login the bot
client.login(BOT_TOKEN);
