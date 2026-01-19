import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import express from "express";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID; // main land claim channel
const ERROR_CHANNEL_ID = process.env.ERROR_CHANNEL_ID;     // error logging channel
const BOT_TOKEN = process.env.BOT_TOKEN;

// Endpoint for Google Form submissions
app.post("/claim", async (req, res) => {
  const { name, extraInfo, imageUrl } = req.body;

  if (!name || !imageUrl) return res.status(400).send("Missing fields");

  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

    // Create an embed with the image
    const embed = new EmbedBuilder()
      .setTitle(`Land Claim • ${name}`)
      .setDescription(extraInfo || "No extra info provided")
      .setImage(imageUrl)
      .setColor(0x00ff00);

    // Send the embed to the main channel
    const message = await channel.send({ embeds: [embed] });

    // Create a thread attached to this message
    const thread = await message.startThread({
      name: `Claim • ${name}`,
      autoArchiveDuration: 1440 // 24 hours
    });

    res.status(200).send("Posted to Discord with thread!");
  } catch (err) {
    console.error(err);

    try {
      const errorChannel = await client.channels.fetch(ERROR_CHANNEL_ID);
      await errorChannel.send(`❌ **Error posting land claim:**\n\`\`\`${err}\`\`\``);
    } catch (err2) {
      console.error("Failed to log error:", err2);
    }

    res.status(500).send("Failed to post to Discord");
  }
});

// Keep the service alive
app.get("/", (req, res) => res.send("Bot is running"));

client.once("ready", () => console.log(`Logged in as ${client.user.tag}`));
client.login(BOT_TOKEN);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
