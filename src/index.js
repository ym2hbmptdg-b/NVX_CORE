import "dotenv/config";

import {
  Client,
  Events,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder
} from "discord.js";

import path from "node:path";
import { fileURLToPath } from "node:url";

import { setupTicketSystem } from "./tickets.js";

/* =========================================================
   CHEMINS
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WELCOME_IMAGE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "welcome.png"
);

/* =========================================================
   CONFIGURATION
========================================================= */

const TOKEN = process.env.DISCORD_TOKEN;

const TAGOUT_GUILD_ID =
  process.env.TAGOUT_GUILD_ID;

const NVX_LABS_GUILD_ID =
  process.env.NVX_LABS_GUILD_ID;

const BUG_CHANNEL_ID =
  process.env.BUG_CHANNEL_ID || null;

const WELCOME_CHANNEL_ID =
  process.env.WELCOME_CHANNEL_ID || null;

const SUPPORT_CHANNEL_ID =
  process.env.SUPPORT_CHANNEL_ID || null;

const TICKET_CATEGORY_ID =
  process.env.TICKET_CATEGORY_ID || null;

/*
 * Rôle automatique donné aux nouveaux membres
 */
const WELCOME_ROLE_ID =
  "1552052558686851192";

/* =========================================================
   VÉRIFICATIONS
========================================================= */

if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN manque.");
  process.exit(1);
}

if (!TAGOUT_GUILD_ID) {
  console.error("❌ TAGOUT_GUILD_ID manque.");
  process.exit(1);
}

if (!NVX_LABS_GUILD_ID) {
  console.error("❌ NVX_LABS_GUILD_ID manque.");
  process.exit(1);
}

/* =========================================================
   RÔLES STAFF
========================================================= */

const staffRoles =
  (process.env.STAFF_ROLE_NAMES || "")
    .split(",")
    .map(role =>
      role.trim().toLowerCase()
    )
    .filter(Boolean);

/* =========================================================
   CLIENT DISCORD
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

/* =========================================================
   SYSTÈME DE TICKETS
========================================================= */

setupTicketSystem(client, {
  supportChannelId:
    SUPPORT_CHANNEL_ID,

  ticketCategoryId:
    TICKET_CATEGORY_ID,

  staffRoleNames:
    staffRoles
});

/* =========================================================
   SERVEURS
========================================================= */

function isLabs(guildId) {
  return guildId === NVX_LABS_GUILD_ID;
}

function isTagOut(guildId) {
  return guildId === TAGOUT_GUILD_ID;
}

function getServerName(guildId) {
  if (isLabs(guildId)) {
    return "NXS LABS";
  }

  if (isTagOut(guildId)) {
    return "TAG::OUT";
  }

  return "Serveur";
}

/* =========================================================
   PERMISSIONS
========================================================= */

function hasStaffRole(member) {
  if (!member?.roles?.cache) {
    return false;
  }

  return member.roles.cache.some(role =>
    staffRoles.includes(
      role.name.toLowerCase()
    )
  );
}

function canManage(member) {
  return Boolean(
    member?.permissions?.has(
      PermissionFlagsBits.ManageGuild
    ) ||
    member?.permissions?.has(
      PermissionFlagsBits.Administrator
    ) ||
    hasStaffRole(member)
  );
}

/* =========================================================
   EMBED DE BASE
========================================================= */

function baseEmbed(
  title,
  description,
  guildId
) {
  return new EmbedBuilder()
    .setColor(0x7C5CFC)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text:
        `NVX CORE • ${getServerName(guildId)}`
    })
    .setTimestamp();
}

/* =========================================================
   BOT PRÊT
========================================================= */

client.once(
  Events.ClientReady,
  readyClient => {
    console.log(
      `✅ NVX CORE connecté en tant que ${readyClient.user.tag}`
    );
  }
);

/* =========================================================
   ARRIVÉE D'UN MEMBRE
========================================================= */

client.on(
  Events.GuildMemberAdd,
  async member => {
    try {

      /*
       * Accueil uniquement sur NXS LABS
       */
      if (!isLabs(member.guild.id)) {
        return;
      }

      console.log(
        `👋 Nouveau membre : ${member.user.tag}`
      );

      /* =====================================================
         RÔLE AUTOMATIQUE
      ===================================================== */

      const welcomeRole =
        member.guild.roles.cache.get(
          WELCOME_ROLE_ID
        );

      if (!welcomeRole) {

        console.error(
          `❌ Rôle automatique introuvable : ${WELCOME_ROLE_ID}`
        );

      } else {

        const botMember =
          member.guild.members.me;

        if (!botMember) {

          console.error(
            "❌ NVX CORE est introuvable dans le serveur."
          );

        } else if (
          !botMember.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        ) {

          console.error(
            "❌ NVX CORE n'a pas la permission Gérer les rôles."
          );

        } else if (
          welcomeRole.position >=
          botMember.roles.highest.position
        ) {

          console.error(
            "❌ Le rôle automatique est placé au-dessus de NVX CORE."
          );

        } else {

          await member.roles.add(
            welcomeRole,
            "Attribution automatique à l'arrivée sur NXS LABS"
          );

          console.log(
            `✅ Rôle "${welcomeRole.name}" donné à ${member.user.tag}`
          );
        }
      }

      /* =====================================================
         SALON D'ACCUEIL
      ===================================================== */

      if (!WELCOME_CHANNEL_ID) {

        console.log(
          "⚠️ WELCOME_CHANNEL_ID n'est pas configuré."
        );

        return;
      }

      const welcomeChannel =
        await client.channels
          .fetch(WELCOME_CHANNEL_ID)
          .catch(() => null);

      if (
        !welcomeChannel ||
        !welcomeChannel.isTextBased()
      ) {

        console.error(
          "❌ Salon de bienvenue introuvable."
        );

        return;
      }

      /* =====================================================
         FOND PERSONNALISÉ
      ===================================================== */

      const welcomeImage =
        new AttachmentBuilder(
          WELCOME_IMAGE_PATH,
          {
            name: "welcome.png"
          }
        );

      /* =====================================================
         MESSAGE D'ACCUEIL
      ===================================================== */

      const welcomeEmbed =
        new EmbedBuilder()

          .setColor(0x7C5CFC)

          .setAuthor({
            name:
              "NXS LABS • NEW MEMBER",

            iconURL:
              member.guild.iconURL({
                size: 256
              }) || undefined
          })

          .setTitle(
            "🚀 BIENVENUE À BORD, VOYAGEUR ! 🌌"
          )

          .setDescription(
            `> 🛰️ Connexion au réseau spatial établie...\n` +
            `> 📡 Transmission reçue...\n` +
            `> 🌠 Bienvenue dans **${member.guild.name}**.\n\n` +

            `Ici, tu viens d’entrer dans le ` +
            `**centre de développement** de notre univers.\n` +
            `💻 Projets • 🛠️ Développement • 🎨 Création • 🚀 Futurs projets\n\n` +

            `Chaque idée, chaque ligne de code et chaque création ` +
            `contribue à construire quelque chose de plus grand. 🌌\n\n` +

            `╭─────────────── ✦ ───────────────╮\n` +
            `  🌙 **COMMENCE TON EXPÉDITION**\n` +
            `╰─────────────── ✦ ───────────────╯\n\n` +

            `📜・Lis les règles et les informations importantes\n` +
            `🛰️・Présente-toi à l’équipage\n` +
            `💬・Rejoins les discussions\n` +
            `🔭・Découvre les projets en cours\n` +
            `🚀・Participe au développement\n\n` +

            `> **« L’espace est immense. Nos projets le seront encore plus. »** 🌠\n\n` +

            `✨ **Bon voyage, ${member}, et bienvenue dans l’équipage !**`
          )

          .setThumbnail(
            member.user.displayAvatarURL({
              size: 512
            })
          )

          .addFields(
            {
              name: "👤 Voyageur",
              value: `${member}`,
              inline: true
            },

            {
              name: "🌌 Équipage",
              value:
                `Membre #${member.guild.memberCount}`,
              inline: true
            }
          )

          .setImage(
            "attachment://welcome.png"
          )

          .setFooter({
            text:
              "NXS LABS • Powered by NVX CORE",

            iconURL:
              client.user.displayAvatarURL({
                size: 256
              })
          })

          .setTimestamp();

      /* =====================================================
         ENVOI
      ===================================================== */

      await welcomeChannel.send({

        content:
          `🚀 **Bienvenue ${member} à bord de NXS LABS !**`,

        embeds: [
          welcomeEmbed
        ],

        files: [
          welcomeImage
        ],

        allowedMentions: {
          users: [
            member.id
          ]
        }
      });

      console.log(
        `✅ Message d'accueil envoyé pour ${member.user.tag}`
      );

    } catch (error) {

      console.error(
        "❌ Erreur système d'arrivée :",
        error
      );
    }
  }
);

/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      /* =====================================================
         BOUTONS
      ===================================================== */

      if (interaction.isButton()) {

        /* ---------------------------------------------------
           ACCEPTATION DU RÈGLEMENT NXS LABS
        --------------------------------------------------- */

        if (
          interaction.customId ===
          "accept_nxs_labs_rules"
        ) {

          if (!isLabs(interaction.guildId)) {

            return interaction.reply({
              content:
                "⛔ Ce bouton est réservé à NXS LABS.",
              ephemeral: true
            });
          }

          const role =
            interaction.guild.roles.cache.find(
              role =>
                role.name ===
                "✅ Membre vérifié"
            );

          if (!role) {

            return interaction.reply({
              content:
                "⚠️ Le rôle **✅ Membre vérifié** est introuvable.",
              ephemeral: true
            });
          }

          const botMember =
            interaction.guild.members.me;

          if (
            !botMember?.permissions.has(
              PermissionFlagsBits.ManageRoles
            )
          ) {

            return interaction.reply({
              content:
                "⚠️ NVX CORE n'a pas la permission **Gérer les rôles**.",
              ephemeral: true
            });
          }

          if (
            role.position >=
            botMember.roles.highest.position
          ) {

            return interaction.reply({
              content:
                "⚠️ Le rôle **✅ Membre vérifié** doit être placé sous **NVX CORE**.",
              ephemeral: true
            });
          }

          if (
            interaction.member.roles.cache.has(
              role.id
            )
          ) {

            return interaction.reply({
              content:
                "✅ Tu as déjà accepté le règlement.",
              ephemeral: true
            });
          }

          await interaction.member.roles.add(
            role,
            "Acceptation du règlement NXS LABS"
          );

          return interaction.reply({
            content:
              "✅ **Règlement accepté !**\n" +
              "Le rôle **✅ Membre vérifié** t'a été attribué.",
            ephemeral: true
          });
        }

        return;
      }

      /* =====================================================
         COMMANDES SLASH
      ===================================================== */

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const commandName =
        interaction.commandName;

      const guildId =
        interaction.guildId;

      /* =====================================================
         /ping
      ===================================================== */

      if (commandName === "ping") {

        return interaction.reply({
          content:
            `🏓 Pong ! Latence : ${client.ws.ping} ms`
        });
      }

      /* =====================================================
         /help
      ===================================================== */

      if (commandName === "help") {

        if (isLabs(guildId)) {

          return interaction.reply({

            embeds: [
              baseEmbed(

                "🤖 NVX CORE",

                "**NXS LABS**\n\n" +

                "🏓 `/ping` — Vérifier le bot\n" +
                "🐛 `/bug` — Signaler un bug\n" +
                "💡 `/suggest` — Envoyer une suggestion\n" +
                "📜 `/rules` — Afficher le règlement\n\n" +

                "**🛠️ Développement**\n" +
                "📢 `/announce`\n" +
                "🧪 `/devlog`\n" +
                "🏗️ `/build`\n" +
                "📝 `/changelog`",

                guildId
              )
            ],

            ephemeral: true
          });
        }

        if (isTagOut(guildId)) {

          return interaction.reply({

            embeds: [
              baseEmbed(

                "🤖 NVX CORE",

                "**TAG::OUT**\n\n" +

                "🏓 `/ping`\n" +
                "🎮 `/game`\n" +
                "📜 `/rules`\n" +
                "🔗 `/link`\n" +
                "🐛 `/bug`\n" +
                "💡 `/suggest`\n" +
                "📢 `/update`",

                guildId
              )
            ],

            ephemeral: true
          });
        }

        return interaction.reply({
          content:
            "❓ Ce serveur n'est pas configuré pour NVX CORE.",
          ephemeral: true
        });
      }

      /* =====================================================
         /game
      ===================================================== */

      if (commandName === "game") {

        if (!isTagOut(guildId)) {

          return interaction.reply({
            content:
              "⛔ Cette commande est réservée à TAG::OUT.",
            ephemeral: true
          });
        }

        return interaction.reply({

          embeds: [
            baseEmbed(

              "🎮 TAG::OUT",

              "**Cours. Esquive. Touche. Survis.**\n\n" +
              "Un jeu multijoueur basé sur le concept du Touche-Touche.\n\n" +
              "🗺️ Maps • ⚡ Capacités • 🪙 Récompenses • 🎨 Cosmétiques",

              guildId
            )
          ]
        });
      }

      /* =====================================================
         /rules
      ===================================================== */

      if (commandName === "rules") {

        if (isLabs(guildId)) {

          const button =
            new ButtonBuilder()
              .setCustomId(
                "accept_nxs_labs_rules"
              )
              .setLabel(
                "J'accepte le règlement"
              )
              .setEmoji("✅")
              .setStyle(
                ButtonStyle.Success
              );

          const row =
            new ActionRowBuilder()
              .addComponents(
                button
              );

          return interaction.reply({

            embeds: [

              baseEmbed(

                "📜 Règlement NXS LABS",

                "Bienvenue sur **NXS LABS** 🧪\n\n" +

                "**1. Respect**\n" +
                "Respecte les membres, les développeurs et le staff.\n\n" +

                "**2. Utilisation des salons**\n" +
                "Utilise chaque salon pour son sujet et évite le spam.\n\n" +

                "**3. Projets et informations**\n" +
                "Les informations internes, fichiers et contenus de développement ne doivent pas être partagés sans autorisation.\n\n" +

                "**4. Bugs et suggestions**\n" +
                "🐛 `/bug` pour signaler un problème.\n" +
                "💡 `/suggest` pour proposer une idée.\n\n" +

                "**5. Staff**\n" +
                "Les décisions du staff doivent être respectées.\n\n" +

                "**6. Règles Discord**\n" +
                "Le règlement de Discord s'applique également sur NXS LABS.\n\n" +

                "👇 Clique sur le bouton ci-dessous pour accepter le règlement.",

                guildId
              )
            ],

            components: [
              row
            ]
          });
        }

        if (isTagOut(guildId)) {

          return interaction.reply({

            embeds: [

              baseEmbed(

                "📜 Règlement TAG::OUT",

                "Respecte les autres membres, évite le spam et utilise les salons correspondant à leur sujet.\n\n" +
                "🐛 Pour les bugs : `/bug`\n" +
                "💡 Pour les idées : `/suggest`",

                guildId
              )
            ]
          });
        }

        return interaction.reply({
          content:
            "❓ Ce serveur n'est pas configuré pour cette commande.",
          ephemeral: true
        });
      }

      /* =====================================================
         /link
      ===================================================== */

      if (commandName === "link") {

        if (!isTagOut(guildId)) {

          return interaction.reply({
            content:
              "⛔ Cette commande est réservée à TAG::OUT.",
            ephemeral: true
          });
        }

        const discord =
          interaction.options.getString(
            "discord",
            true
          );

        const roblox =
          interaction.options.getString(
            "roblox",
            true
          );

        return interaction.reply({

          embeds: [

            baseEmbed(

              "🔗 Liens officiels",

              `💬 Discord : ${discord}\n🎮 Roblox : ${roblox}`,

              guildId
            )
          ]
        });
      }

      /* =====================================================
         /bug
      ===================================================== */

      if (commandName === "bug") {

        const description =
          interaction.options.getString(
            "description",
            true
          );

        console.log(
          `[BUG] ${interaction.user.tag} | ` +
          `${getServerName(guildId)} | ${description}`
        );

        if (BUG_CHANNEL_ID) {

          const bugChannel =
            await client.channels
              .fetch(BUG_CHANNEL_ID)
              .catch(() => null);

          if (
            bugChannel &&
            bugChannel.isTextBased()
          ) {

            const bugEmbed =
              new EmbedBuilder()

                .setColor(0xFF5C5C)

                .setTitle(
                  "🐛 Nouveau bug"
                )

                .addFields(

                  {
                    name:
                      "👤 Signalé par",
                    value:
                      `${interaction.user}`,
                    inline: true
                  },

                  {
                    name:
                      "🧪 Serveur",
                    value:
                      getServerName(
                        guildId
                      ),
                    inline: true
                  },

                  {
                    name:
                      "📝 Description",
                    value:
                      description.slice(
                        0,
                        1024
                      )
                  }
                )

                .setFooter({
                  text:
                    "NVX CORE • Système de signalement"
                })

                .setTimestamp();

            await bugChannel.send({
              embeds: [
                bugEmbed
              ],
              allowedMentions: {
                parse: []
              }
            });

            return interaction.reply({
              content:
                "🐛 **Bug enregistré !**\n" +
                "Ton signalement a été envoyé à l'équipe.",
              ephemeral: true
            });
          }
        }

        return interaction.reply({
          content:
            "🐛 **Bug enregistré !**\n" +
            `Merci pour ton signalement pour **${getServerName(guildId)}**.`,
          ephemeral: true
        });
      }

      /* =====================================================
         /suggest
      ===================================================== */

      if (commandName === "suggest") {

        const suggestion =
          interaction.options.getString(
            "suggestion",
            true
          );

        console.log(
          `[SUGGESTION] ${interaction.user.tag} | ` +
          `${getServerName(guildId)} | ${suggestion}`
        );

        return interaction.reply({
          content:
            "💡 **Suggestion enregistrée !**\n" +
            `Merci pour ton idée pour **${getServerName(guildId)}**.`,
          ephemeral: true
        });
      }

      /* =====================================================
         /update
      ===================================================== */

      if (commandName === "update") {

        if (!isTagOut(guildId)) {

          return interaction.reply({
            content:
              "⛔ Cette commande est réservée à TAG::OUT.",
            ephemeral: true
          });
        }

        return interaction.reply({

          embeds: [

            baseEmbed(

              "📢 TAG::OUT — Mise à jour",

              "Aucune mise à jour publiée pour le moment.",

              guildId
            )
          ]
        });
      }

      /* =====================================================
         COMMANDES STAFF / DEV
      ===================================================== */

      const staffCommands =
        new Set([
          "announce",
          "devlog",
          "build",
          "changelog"
        ]);

      if (
        staffCommands.has(
          commandName
        )
      ) {

        if (
          !canManage(
            interaction.member
          )
        ) {

          return interaction.reply({
            content:
              "⛔ Tu n'as pas la permission d'utiliser cette commande.",
            ephemeral: true
          });
        }

        /* ---------------------------------------------------
           /announce
        --------------------------------------------------- */

        if (
          commandName ===
          "announce"
        ) {

          const message =
            interaction.options.getString(
              "message",
              true
            );

          return interaction.reply({
            embeds: [

              baseEmbed(
                "📢 Annonce",
                message,
                guildId
              )
            ]
          });
        }

        /* ---------------------------------------------------
           NXS LABS uniquement
        --------------------------------------------------- */

        if (!isLabs(guildId)) {

          return interaction.reply({
            content:
              "⛔ Cette commande est réservée à NXS LABS.",
            ephemeral: true
          });
        }

        /* ---------------------------------------------------
           /devlog
        --------------------------------------------------- */

        if (
          commandName ===
          "devlog"
        ) {

          const text =
            interaction.options.getString(
              "text",
              true
            );

          return interaction.reply({
            embeds: [

              baseEmbed(
                "🧪 NXS LABS — Devlog",
                text,
                guildId
              )
            ]
          });
        }

        /* ---------------------------------------------------
           /build
        --------------------------------------------------- */

        if (
          commandName ===
          "build"
        ) {

          const version =
            interaction.options.getString(
              "version",
              true
            );

          const status =
            interaction.options.getString(
              "status",
              true
            );

          const changes =
            interaction.options.getString(
              "changes",
              true
            );

          return interaction.reply({
            embeds: [

              baseEmbed(

                `🏗️ Build ${version}`,

                `**Statut :** ${status}\n\n` +
                `**Modifications :**\n${changes}`,

                guildId
              )
            ]
          });
        }

        /* ---------------------------------------------------
           /changelog
        --------------------------------------------------- */

        if (
          commandName ===
          "changelog"
        ) {

          const version =
            interaction.options.getString(
              "version",
              true
            );

          const changes =
            interaction.options.getString(
              "changes",
              true
            );

          return interaction.reply({
            embeds: [

              baseEmbed(

                `📝 Changelog ${version}`,

                changes,

                guildId
              )
            ]
          });
        }
      }

      /* =====================================================
         COMMANDE INCONNUE
      ===================================================== */

      return interaction.reply({
        content:
          "❓ Commande inconnue.",
        ephemeral: true
      });

    } catch (error) {

      console.error(
        "❌ Erreur :",
        error
      );

      if (
        interaction.replied ||
        interaction.deferred
      ) {

        return interaction.followUp({
          content:
            "⚠️ Une erreur est survenue.",
          ephemeral: true
        });
      }

      return interaction.reply({
        content:
          "⚠️ Une erreur est survenue.",
        ephemeral: true
      });
    }
  }
);

/* =========================================================
   CONNEXION
========================================================= */

client.login(TOKEN);