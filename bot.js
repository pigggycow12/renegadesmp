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

// ---- Safety check ----
if (!BOT_TOKEN || !DISCORD_CHANNEL_ID || !ERROR_CHANNEL_ID) {
  console.error("❌ Missing environment variables!");
  console.error("Set BOT_TOKEN, DISCORD_CHANNEL_ID, ERROR_CHANNEL_ID");
  process.exit(1);
}

// ---- Helpers ----
function convertDriveLink(link) {
  if (!link) return null;

  const match =
    link.match(/id=([a-zA-Z0-9_-]+)/) ||
    link.match(/\/d\/([a-zA-Z0-9_-]+)/);

  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }

  return link; // fallback
}

async function logError(message) {
  try {
    const errorChannel = await client.channels.fetch(ERROR_CHANNEL_ID);
    await errorChannel.send(message);
  } catch (err) {
    console.error("⚠️ Failed to log error:", err);
  }
}

// ---- Main endpoint ----
app.post("/claim", async (req, res) => {
  try {
    const { name, extraInfo, imageUrl: rawUrl } = req.body;

    if (!name || !rawUrl) {
      console.log("❌ Missing name or image URL");
      return res.status(400).send("Missing name or image URL");
    }

    const imageUrl = convertDriveLink(rawUrl);
    console.log("📸 Image URL:", imageUrl);

    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
    if (!channel) throw new Error("Land-claim channel not found");

    const embed = new EmbedBuilder()
      .setTitle(`Land Claim • ${name}`)
      .setDescription(extraInfo || "No extra info provided")
      .setColor(0x00ff00)
      .setFooter({ text: "Renegade SMP Land Claim" })
      .setTimestamp();

    // Only attach image if URL looks valid
    if (imageUrl && imageUrl.startsWith("http")) {
      embed.setImage(imageUrl);
    } else {
      console.warn("⚠️ Image URL invalid, skipping embed image");
      await logError(`⚠️ Invalid image URL for ${name}:\n${rawUrl}`);
    }

    // 1️⃣ Send embed (never rollback this)
    const message = await channel.send({ embeds: [embed] });

    // 2️⃣ Try thread creation, but never kill the post
    try {
      await message.startThread({
        name: `Claim • ${name}`,
        autoArchiveDuration: 1440,
      });
    } catch (threadErr) {
      console.error("⚠️ Thread creation failed:", threadErr);
      await logError(
        `⚠️ Thread creation failed for ${name}:\n\`\`\`${threadErr}\`\`\``
      );
    }

    res.status(200).send("✅ Posted to Discord");

  } catch (err) {
    console.error("🔥 Fatal error in /claim:", err);

    await logError(
      `❌ Fatal error posting land claim:\n\`\`\`${err}\`\`\``
    );

    res.status(500).send("❌ Failed to post to Discord");
  }
});

// ---- Health check ----
app.get("/", (req, res) => res.send("Bot is running"));

// ---- Boot ----
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(BOT_TOKEN);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
