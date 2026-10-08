import "dotenv/config";
import {
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildIds = [
  process.env.TAGOUT_GUILD_ID,
  process.env.NVX_LABS_GUILD_ID
].filter(Boolean);

if (!token || !clientId || guildIds.length === 0) {
  console.error(
    "❌ Remplis DISCORD_TOKEN, DISCORD_CLIENT_ID et au moins un GUILD_ID dans .env"
  );
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie si NVX CORE répond."),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche les commandes de NVX CORE."),

  new SlashCommandBuilder()
    .setName("game")
    .setDescription("Présente TAG::OUT."),

  new SlashCommandBuilder()
    .setName("rules")
    .setDescription("Affiche le règlement."),

  new SlashCommandBuilder()
    .setName("link")
    .setDescription("Affiche les liens officiels.")
    .addStringOption(o =>
      o.setName("discord")
        .setDescription("Lien d'invitation Discord")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("roblox")
        .setDescription("Lien vers le jeu Roblox")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("bug")
    .setDescription("Signale un bug.")
    .addStringOption(o =>
      o.setName("description")
        .setDescription("Décris le bug")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Envoie une suggestion.")
    .addStringOption(o =>
      o.setName("suggestion")
        .setDescription("Ton idée")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("update")
    .setDescription("Affiche la dernière mise à jour."),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Publie une annonce.")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("Contenu de l'annonce")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("devlog")
    .setDescription("Publie un devlog dans NVX LABS.")
    .addStringOption(o =>
      o.setName("text")
        .setDescription("Contenu du devlog")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("build")
    .setDescription("Publie les informations d'un build.")
    .addStringOption(o =>
      o.setName("version")
        .setDescription("Version/build")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("status")
        .setDescription("Statut")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("changes")
        .setDescription("Modifications")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("changelog")
    .setDescription("Publie un changelog.")
    .addStringOption(o =>
      o.setName("version")
        .setDescription("Version")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("changes")
        .setDescription("Modifications")
        .setRequired(true))
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

for (const guildId of guildIds) {
  try {
    console.log(`🔄 Enregistrement des commandes sur ${guildId}...`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`✅ Commandes enregistrées sur ${guildId}.`);
  } catch (error) {
    console.error(`❌ Échec pour ${guildId}:`, error);
  }
}
