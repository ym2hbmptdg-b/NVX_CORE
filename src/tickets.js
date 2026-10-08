import {
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder
} from "discord.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const STAFF_TICKET_ROLE_ID = "1552053390337384640";

/* =========================================================
   TYPES DE TICKETS
========================================================= */

const TICKET_TYPES = {
  support: {
    label: "Support",
    emoji: "🛠️",
    slug: "support",
    description: "Besoin d'aide avec NXS LABS."
  },

  bug: {
    label: "Bug important",
    emoji: "🐛",
    slug: "bug",
    description: "Signaler un problème important."
  },

  suggestion: {
    label: "Suggestion",
    emoji: "💡",
    slug: "suggestion",
    description: "Proposer une idée pour NXS LABS."
  },

  staff: {
    label: "Contacter le staff",
    emoji: "👤",
    slug: "staff",
    description: "Contacter directement l'équipe."
  },

  collaboration: {
    label: "Collaboration",
    emoji: "🤝",
    slug: "collaboration",
    description: "Proposition de collaboration."
  },

  development: {
    label: "Développement",
    emoji: "💻",
    slug: "development",
    description: "Projet ou demande liée au développement."
  },

  other: {
    label: "Autre",
    emoji: "❓",
    slug: "other",
    description: "Une autre demande."
  }
};

/* =========================================================
   UTILITAIRES
========================================================= */

function getTicketOwnerId(topic) {
  const match = topic?.match(/NVX_TICKET_OWNER:([0-9]+)/);
  return match?.[1] || null;
}

function getTicketClaimerId(topic) {
  const match = topic?.match(/NVX_TICKET_CLAIMED_BY:([0-9]+)/);
  return match?.[1] || null;
}

function buildTicketTopic(ownerId, claimerId = null) {
  return (
    `NVX_TICKET_OWNER:${ownerId}` +
    `|NVX_TICKET_CLAIMED_BY:${claimerId || "none"}`
  );
}

function isTicketChannel(channel) {
  return Boolean(
    channel?.topic?.includes("NVX_TICKET_OWNER:")
  );
}

/* =========================================================
   VÉRIFICATION STAFF TICKETS
========================================================= */

function isTicketStaff(member) {
  if (!member?.roles?.cache) {
    return false;
  }

  return member.roles.cache.has(STAFF_TICKET_ROLE_ID);
}

/* =========================================================
   BOUTONS TICKET
========================================================= */

function createTicketButtons(claimer = null) {
  const claimButton = new ButtonBuilder()
    .setCustomId(
      claimer
        ? "nxs_ticket_unclaim"
        : "nxs_ticket_claim"
    )
    .setLabel(
      claimer
        ? "Unclaim"
        : "Claim"
    )
    .setEmoji(
      claimer
        ? "🔴"
        : "🟢"
    )
    .setStyle(
      claimer
        ? ButtonStyle.Danger
        : ButtonStyle.Success
    );

  const transcriptButton = new ButtonBuilder()
    .setCustomId("nxs_ticket_transcript")
    .setLabel("Transcript")
    .setEmoji("📄")
    .setStyle(ButtonStyle.Secondary);

  const closeButton = new ButtonBuilder()
    .setCustomId("nxs_ticket_close")
    .setLabel("Fermer le ticket")
    .setEmoji("🔒")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(
    claimButton,
    transcriptButton,
    closeButton
  );
}

/* =========================================================
   PANEL TICKETS
========================================================= */

async function setupTicketPanel(client, supportChannelId) {
  try {
    if (!supportChannelId) {
      console.log(
        "⚠️ SUPPORT_CHANNEL_ID n'est pas configuré."
      );
      return;
    }

    const channel = await client.channels
      .fetch(supportChannelId)
      .catch(() => null);

    if (!channel || !channel.isTextBased()) {
      console.error(
        "❌ Salon support introuvable."
      );
      return;
    }

    const messages = await channel.messages
      .fetch({ limit: 50 })
      .catch(() => null);

    if (!messages) {
      return;
    }

    const existingPanel = messages.find(
      message =>
        message.author.id === client.user.id &&
        message.embeds?.[0]?.title ===
          "🎫 NXS LABS — CENTRE DE SUPPORT"
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("nxs_ticket_type")
      .setPlaceholder(
        "Choisis le type de demande..."
      )
      .addOptions(
        Object.entries(TICKET_TYPES).map(
          ([value, ticket]) => ({
            label: ticket.label,
            value,
            description: ticket.description,
            emoji: ticket.emoji
          })
        )
      );

    const row = new ActionRowBuilder()
      .addComponents(selectMenu);

    const panelEmbed = new EmbedBuilder()
      .setColor(0x7C5CFC)
      .setTitle(
        "🎫 NXS LABS — CENTRE DE SUPPORT"
      )
      .setDescription(
        "**Bienvenue dans le centre de support NXS LABS.** 🧪\n\n" +
        "Tu as besoin d'aide, tu souhaites signaler un problème " +
        "ou simplement contacter l'équipe ?\n\n" +
        "Choisis directement **le type de demande** dans le menu ci-dessous.\n\n" +
        "🔒 Ton ticket sera automatiquement créé dans un espace privé " +
        "accessible uniquement par toi et l'équipe concernée.\n\n" +
        "> 🚀 **Choisis une catégorie pour commencer.**"
      )
      .setFooter({
        text: "NXS LABS • Powered by NVX CORE"
      })
      .setTimestamp();

    if (existingPanel) {
      await existingPanel.edit({
        embeds: [panelEmbed],
        components: [row]
      });

      console.log(
        "✅ Panel tickets mis à jour."
      );

      return;
    }

    await channel.send({
      embeds: [panelEmbed],
      components: [row]
    });

    console.log(
      "✅ Panel tickets créé."
    );

  } catch (error) {
    console.error(
      "❌ Erreur panel tickets :",
      error
    );
  }
}

/* =========================================================
   CRÉATION D'UN TICKET
========================================================= */

async function createTicket(
  interaction,
  ticketType,
  categoryId
) {
  const guild = interaction.guild;
  const ticket = TICKET_TYPES[ticketType];

  if (!guild || !ticket) {
    return;
  }

  const category = guild.channels.cache.get(
    categoryId
  );

  if (
    !category ||
    category.type !== ChannelType.GuildCategory
  ) {
    return interaction.reply({
      content:
        "⚠️ La catégorie des tickets est introuvable.",
      ephemeral: true
    });
  }

  /* Vérifier ticket déjà ouvert */

  const existingTicket =
    guild.channels.cache.find(
      channel =>
        channel.parentId === categoryId &&
        getTicketOwnerId(channel.topic) ===
          interaction.user.id
    );

  if (existingTicket) {
    return interaction.reply({
      content:
        `🎫 Tu as déjà un ticket ouvert : ${existingTicket}`,
      ephemeral: true
    });
  }

  /* Permissions */

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel
      ]
    },

    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },

    {
      id: STAFF_TICKET_ROLE_ID,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },

    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  /* Nom */

  const safeUsername =
    interaction.user.username
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 18) || "membre";

  const channelName =
    `ticket-${ticket.slug}-${safeUsername}`;

  /* Création */

  const ticketChannel =
    await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: buildTicketTopic(
        interaction.user.id
      ),
      permissionOverwrites,
      reason:
        `Ticket ${ticket.label} créé par ${interaction.user.tag}`
    });

  /* Embed */

  const ticketEmbed = new EmbedBuilder()
    .setColor(0x7C5CFC)
    .setTitle(
      `${ticket.emoji} ${ticket.label}`
    )
    .setDescription(
      `Bienvenue ${interaction.user} !\n\n` +
      `**Catégorie :** ${ticket.label}\n\n` +
      `${ticket.description}\n\n` +
      "📝 **Décris ta demande ci-dessous.**\n" +
      "Un membre de l'équipe viendra te répondre dès que possible.\n\n" +
      "> 🔒 Ce ticket est privé.\n" +
      "> 🟢 Le staff peut prendre en charge ce ticket.\n" +
      "> 📄 Un transcript peut être généré."
    )
    .addFields(
      {
        name: "👤 Demandeur",
        value: `${interaction.user}`,
        inline: true
      },
      {
        name: "📂 Catégorie",
        value:
          `${ticket.emoji} ${ticket.label}`,
        inline: true
      },
      {
        name: "🟢 Responsable",
        value:
          "Aucun membre du staff pour le moment.",
        inline: false
      }
    )
    .setFooter({
      text: "NXS LABS • NVX CORE"
    })
    .setTimestamp();

  await ticketChannel.send({
    content:
      `${interaction.user} • **Ticket ouvert**`,
    embeds: [ticketEmbed],
    components: [
      createTicketButtons()
    ],
    allowedMentions: {
      users: [interaction.user.id]
    }
  });

  return interaction.reply({
    content:
      `✅ Ton ticket a été créé : ${ticketChannel}`,
    ephemeral: true
  });
}

/* =========================================================
   CLAIM
========================================================= */

async function claimTicket(interaction) {
  const channel = interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content:
        "⛔ Ce salon n'est pas un ticket NVX CORE.",
      ephemeral: true
    });
  }

  if (!isTicketStaff(interaction.member)) {
    return interaction.reply({
      content:
        "⛔ Tu n'as pas le rôle autorisé pour gérer les tickets.",
      ephemeral: true
    });
  }

  const currentClaimer =
    getTicketClaimerId(channel.topic);

  if (currentClaimer) {
    const claimer =
      await interaction.guild.members
        .fetch(currentClaimer)
        .catch(() => null);

    return interaction.reply({
      content:
        `🟠 Ce ticket est déjà claim par ${
          claimer || `<@${currentClaimer}>`
        }.`,
      ephemeral: true
    });
  }

  const ownerId =
    getTicketOwnerId(channel.topic);

  await channel.setTopic(
    buildTicketTopic(
      ownerId,
      interaction.user.id
    )
  );

  const messages =
    await channel.messages.fetch({
      limit: 20
    });

  const ticketMessage =
    messages.find(
      message =>
        message.author.id ===
          interaction.client.user.id &&
        message.components?.some(row =>
          row.components?.some(
            component =>
              component.customId ===
                "nxs_ticket_claim"
          )
        )
    );

  if (ticketMessage) {
    await ticketMessage.edit({
      components: [
        createTicketButtons(
          interaction.user.id
        )
      ]
    });
  }

  await channel.send({
    content:
      `🟢 **Ticket claim par ${interaction.user}.**`,
    allowedMentions: {
      users: [interaction.user.id]
    }
  });

  return interaction.reply({
    content:
      "✅ Ticket claim avec succès.",
    ephemeral: true
  });
}

/* =========================================================
   UNCLAIM
========================================================= */

async function unclaimTicket(interaction) {
  const channel = interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content:
        "⛔ Ce salon n'est pas un ticket NVX CORE.",
      ephemeral: true
    });
  }

  if (!isTicketStaff(interaction.member)) {
    return interaction.reply({
      content:
        "⛔ Tu n'as pas le rôle autorisé pour gérer les tickets.",
      ephemeral: true
    });
  }

  const currentClaimer =
    getTicketClaimerId(channel.topic);

  if (!currentClaimer) {
    return interaction.reply({
      content:
        "ℹ️ Ce ticket n'est actuellement claim par personne.",
      ephemeral: true
    });
  }

  if (
    currentClaimer !==
    interaction.user.id
  ) {
    return interaction.reply({
      content:
        "⛔ Seul le membre qui a claim ce ticket peut faire Unclaim.",
      ephemeral: true
    });
  }

  const ownerId =
    getTicketOwnerId(channel.topic);

  await channel.setTopic(
    buildTicketTopic(ownerId)
  );

  const messages =
    await channel.messages.fetch({
      limit: 20
    });

  const ticketMessage =
    messages.find(
      message =>
        message.author.id ===
          interaction.client.user.id &&
        message.components?.some(row =>
          row.components?.some(
            component =>
              component.customId ===
                "nxs_ticket_unclaim"
          )
        )
    );

  if (ticketMessage) {
    await ticketMessage.edit({
      components: [
        createTicketButtons()
      ]
    });
  }

  await channel.send({
    content:
      `🔴 **${interaction.user} a retiré le claim du ticket.**`
  });

  return interaction.reply({
    content:
      "✅ Ticket unclaim.",
    ephemeral: true
  });
}

/* =========================================================
   RÉCUPÉRER TOUS LES MESSAGES
========================================================= */

async function fetchAllMessages(channel) {
  const allMessages = [];
  let lastId = null;

  while (true) {
    const options = {
      limit: 100
    };

    if (lastId) {
      options.before = lastId;
    }

    const messages =
      await channel.messages.fetch(options);

    if (!messages.size) {
      break;
    }

    allMessages.push(
      ...messages.values()
    );

    lastId =
      messages.last().id;

    if (messages.size < 100) {
      break;
    }
  }

  return allMessages.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp
  );
}

/* =========================================================
   TRANSCRIPT
========================================================= */

async function generateTranscript(channel) {
  const logChannelId =
    process.env.TICKET_LOG_CHANNEL_ID;

  if (!logChannelId) {
    throw new Error(
      "TICKET_LOG_CHANNEL_ID n'est pas configuré."
    );
  }

  const logChannel =
    await channel.client.channels
      .fetch(logChannelId)
      .catch(() => null);

  if (
    !logChannel ||
    !logChannel.isTextBased()
  ) {
    throw new Error(
      "Le salon de logs des tickets est introuvable."
    );
  }

  const messages =
    await fetchAllMessages(channel);

  const ownerId =
    getTicketOwnerId(channel.topic);

  const claimerId =
    getTicketClaimerId(channel.topic);

  const owner =
    ownerId
      ? await channel.guild.members
          .fetch(ownerId)
          .catch(() => null)
      : null;

  const claimer =
    claimerId
      ? await channel.guild.members
          .fetch(claimerId)
          .catch(() => null)
      : null;

  let transcript =
    "==================================================\n";

  transcript +=
    "NXS LABS • NVX CORE • TICKET TRANSCRIPT\n";

  transcript +=
    "==================================================\n\n";

  transcript +=
    `Ticket : ${channel.name}\n`;

  transcript +=
    `ID du salon : ${channel.id}\n`;

  transcript +=
    `Créé le : ${channel.createdAt.toLocaleString("fr-FR")}\n`;

  transcript +=
    `Demandeur : ${
      owner
        ? `${owner.user.tag} (${owner.id})`
        : ownerId || "Inconnu"
    }\n`;

  transcript +=
    `Responsable : ${
      claimer
        ? `${claimer.user.tag} (${claimer.id})`
        : "Aucun"
    }\n\n`;

  transcript +=
    "==================================================\n";

  transcript +=
    "MESSAGES\n";

  transcript +=
    "==================================================\n\n";

  for (const message of messages) {
    const date =
      new Date(
        message.createdTimestamp
      ).toLocaleString("fr-FR");

    const author =
      message.author?.tag ||
      "Utilisateur inconnu";

    let content =
      message.content ||
      "[Message sans texte]";

    transcript +=
      `[${date}] ${author} (${message.author?.id || "?"})\n`;

    transcript +=
      `${content}\n`;

    if (message.attachments.size) {
      transcript +=
        "Pièces jointes :\n";

      for (
        const attachment of
        message.attachments.values()
      ) {
        transcript +=
          `- ${attachment.name || "fichier"} : ${attachment.url}\n`;
      }
    }

    if (message.embeds.length) {
      transcript +=
        `[${message.embeds.length} embed(s)]\n`;
    }

    transcript += "\n";
  }

  transcript +=
    "==================================================\n";

  transcript +=
    `Transcript généré le : ${new Date().toLocaleString("fr-FR")}\n`;

  transcript +=
    "NVX CORE • NXS LABS\n";

  const attachment =
    new AttachmentBuilder(
      Buffer.from(
        transcript,
        "utf8"
      ),
      {
        name:
          `${channel.name}-transcript.txt`
      }
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x7C5CFC)
      .setTitle(
        "📄 Nouveau transcript"
      )
      .setDescription(
        `Transcript du ticket **${channel.name}**`
      )
      .addFields(
        {
          name: "👤 Demandeur",
          value:
            owner
              ? `${owner}`
              : ownerId
                ? `<@${ownerId}>`
                : "Inconnu",
          inline: true
        },
        {
          name: "🟢 Responsable",
          value:
            claimer
              ? `${claimer}`
              : "Aucun",
          inline: true
        },
        {
          name: "💬 Messages",
          value:
            `${messages.length}`,
          inline: true
        }
      )
      .setFooter({
        text:
          "NXS LABS • NVX CORE"
      })
      .setTimestamp();

  await logChannel.send({
    embeds: [embed],
    files: [attachment]
  });

  return messages.length;
}

/* =========================================================
   BOUTON TRANSCRIPT
========================================================= */

async function transcriptTicket(interaction) {
  const channel =
    interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content:
        "⛔ Ce salon n'est pas un ticket NVX CORE.",
      ephemeral: true
    });
  }

  if (!isTicketStaff(interaction.member)) {
    return interaction.reply({
      content:
        "⛔ Tu n'as pas le rôle autorisé pour générer un transcript.",
      ephemeral: true
    });
  }

  await interaction.deferReply({
    ephemeral: true
  });

  try {
    const messageCount =
      await generateTranscript(channel);

    return interaction.editReply({
      content:
        `✅ Transcript généré avec succès. **${messageCount} messages** enregistrés dans le salon des logs.`
    });

  } catch (error) {
    console.error(
      "❌ Erreur transcript :",
      error
    );

    return interaction.editReply({
      content:
        "❌ Impossible de générer le transcript. Vérifie `TICKET_LOG_CHANNEL_ID` et les permissions de NVX CORE."
    });
  }
}

/* =========================================================
   FERMETURE
========================================================= */

async function closeTicket(interaction) {
  const channel =
    interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content:
        "⛔ Ce salon n'est pas un ticket NVX CORE.",
      ephemeral: true
    });
  }

  /* SEUL LE RÔLE STAFF TICKETS */

  if (!isTicketStaff(interaction.member)) {
    return interaction.reply({
      content:
        "⛔ Seul le staff avec le rôle autorisé peut fermer un ticket.",
      ephemeral: true
    });
  }

  const confirmButton =
    new ButtonBuilder()
      .setCustomId(
        "nxs_ticket_close_confirm"
      )
      .setLabel(
        "Confirmer la fermeture"
      )
      .setEmoji("✅")
      .setStyle(ButtonStyle.Danger);

  const cancelButton =
    new ButtonBuilder()
      .setCustomId(
        "nxs_ticket_close_cancel"
      )
      .setLabel("Annuler")
      .setEmoji("↩️")
      .setStyle(ButtonStyle.Secondary);

  const row =
    new ActionRowBuilder()
      .addComponents(
        confirmButton,
        cancelButton
      );

  return interaction.reply({
    content:
      "⚠️ **Es-tu sûr de vouloir fermer ce ticket ?**\n\nLe transcript sera généré avant la suppression du salon.",
    components: [row]
  });
}

/* =========================================================
   CONFIRMATION FERMETURE
========================================================= */

async function confirmCloseTicket(interaction) {
  const channel =
    interaction.channel;

  if (!isTicketChannel(channel)) {
    return interaction.reply({
      content:
        "⛔ Ce salon n'est pas un ticket NVX CORE.",
      ephemeral: true
    });
  }

  if (!isTicketStaff(interaction.member)) {
    return interaction.reply({
      content:
        "⛔ Tu n'as pas le rôle autorisé pour fermer ce ticket.",
      ephemeral: true
    });
  }

  await interaction.deferUpdate();

  try {
    await generateTranscript(channel);

  } catch (error) {
    console.error(
      "❌ Erreur transcript lors de la fermeture :",
      error
    );

    await interaction.message.edit({
      content:
        "⚠️ Le transcript n'a pas pu être généré. Le ticket ne sera pas supprimé.",
      components: []
    });

    return;
  }

  await interaction.message.edit({
    content:
      "✅ **Transcript enregistré.**\n🔒 Fermeture du ticket dans quelques secondes...",
    components: []
  });

  setTimeout(async () => {
    await channel.delete(
      `Ticket fermé par ${interaction.user.tag}`
    ).catch(error =>
      console.error(
        "❌ Impossible de supprimer le ticket :",
        error
      )
    );
  }, 2000);
}

/* =========================================================
   ANNULATION
========================================================= */

async function cancelCloseTicket(interaction) {
  return interaction.update({
    content:
      "↩️ **Fermeture annulée.** Le ticket reste ouvert.",
    components: []
  });
}

/* =========================================================
   INITIALISATION
========================================================= */

export function setupTicketSystem(
  client,
  {
    supportChannelId,
    ticketCategoryId
  }
) {

  /* PANEL AU DÉMARRAGE */

  client.once(
    Events.ClientReady,
    async () => {
      await setupTicketPanel(
        client,
        supportChannelId
      );
    }
  );

  /* INTERACTIONS */

  client.on(
    Events.InteractionCreate,
    async interaction => {

      try {

        /* MENU TICKET */

        if (
          interaction.isStringSelectMenu() &&
          interaction.customId ===
            "nxs_ticket_type"
        ) {

          if (
            interaction.guildId !==
            process.env.NVX_LABS_GUILD_ID
          ) {
            return interaction.reply({
              content:
                "⛔ Le système de tickets est réservé à NXS LABS.",
              ephemeral: true
            });
          }

          const ticketType =
            interaction.values[0];

          return createTicket(
            interaction,
            ticketType,
            ticketCategoryId
          );
        }

        /* CLAIM */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_claim"
        ) {
          return claimTicket(
            interaction
          );
        }

        /* UNCLAIM */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_unclaim"
        ) {
          return unclaimTicket(
            interaction
          );
        }

        /* TRANSCRIPT */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_transcript"
        ) {
          return transcriptTicket(
            interaction
          );
        }

        /* FERMETURE */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_close"
        ) {
          return closeTicket(
            interaction
          );
        }

        /* CONFIRMATION */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_close_confirm"
        ) {
          return confirmCloseTicket(
            interaction
          );
        }

        /* ANNULATION */

        if (
          interaction.isButton() &&
          interaction.customId ===
            "nxs_ticket_close_cancel"
        ) {
          return cancelCloseTicket(
            interaction
          );
        }

      } catch (error) {

        console.error(
          "❌ Erreur système tickets :",
          error
        );

        if (
          interaction.replied ||
          interaction.deferred
        ) {
          return interaction.followUp({
            content:
              "⚠️ Une erreur est survenue avec le système de tickets.",
            ephemeral: true
          });
        }

        return interaction.reply({
          content:
            "⚠️ Une erreur est survenue avec le système de tickets.",
          ephemeral: true
        });
      }
    }
  );
}