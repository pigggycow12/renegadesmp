import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import express from "express";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const ERROR_CHANNEL_ID = process.env.ERROR_CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;

// Safety check for env variables
if (!BOT_TOKEN || !DISCORD_CHANNEL_ID || !ERROR_CHANNEL_ID) {
  console.error("❌ Missing environment variables! Please set BOT_TOKEN, DISCORD_CHANNEL_ID, and ERROR_CHANNEL_ID");
  process.exit(1);
}

// Convert Google Drive links to direct image URLs
function convertDriveLink(link) {
  const match = link.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return link;
}

// Endpoint for Google Form submissions
app.post("/claim", async (req, res) => {
  try {
    const { name, extraInfo, imageUrl: rawUrl } = req.body;

    if (!name || !rawUrl) return res.status(400).send("Missing name or image URL");

    const imageUrl = convertDriveLink(rawUrl);

    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`Land Claim • ${name}`)
      .setDescription(extraInfo || "No extra info provided")
      .setColor(0x00ff00)
      .setImage(imageUrl);

    // Send embed
    const message = await channel.send({ embeds: [embed] });

    // Start thread
    await message.startThread({
      name: `Claim • ${name}`,
      autoArchiveDuration: 1440, // 24h
    });

    res.status(200).send("✅ Posted to Discord with thread!");
  } catch (err) {
    console.error(err);

    try {
      const errorChannel = await client.channels.fetch(ERROR_CHANNEL_ID);
      await errorChannel.send(`❌ Error posting land claim:\n\`\`\`${err}\`\`\``);
    } catch (err2) {
      console.error("Failed to log error:", err2);
    }

    res.status(500).send("❌ Failed to post to Discord");
  }
});

// Health check
app.get("/", (req, res) => res.send("Bot is running"));

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(BOT_TOKEN);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
