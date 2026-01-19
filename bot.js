import Discord from "discord.js";
import express from "express";

const client = new Discord.Client({
  intents: ["Guilds", "GuildMessages", "MessageContent"]
});

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DISCORD_CHANNEL_ID = "1402781201147887789"; // main land claim channel
const ERROR_CHANNEL_ID = "1452791015973851249";   // error logging channel
const BOT_TOKEN = process.env.BOT_TOKEN;

// Endpoint for Google Form submissions
app.post("/claim", async (req, res) => {
  const { name, extraInfo, imageUrl } = req.body;

  if (!name || !imageUrl) return res.status(400).send("Missing fields");

  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);

    // Send the initial claim message
    const message = await channel.send({
      content: `📍 **Land Claim Submitted**\n**Name:** ${name}\n**Info:** ${extraInfo}`,
      files: [imageUrl] // attach image inline
    });

    // Create a thread attached to this message
    const thread = await message.startThread({
      name: `Claim • ${name}`,
      autoArchiveDuration: 1440 // 24 hours
    });

    // Optional: send image again in the thread
    await thread.send({
      content: "Attached map for discussion:",
      files: [imageUrl]
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
