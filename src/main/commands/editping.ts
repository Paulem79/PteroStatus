// noinspection JSUnusedGlobalSymbols

import { Command } from "../handlers/commands.ts";
import {
  ChannelType,
  InteractionContextType,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
} from "../../deps.ts";
import {
  getPing,
  setPingChannel,
  updatePingCredentials,
  updatePingName,
} from "../sql/requests.ts";
import { MessageBuilder } from "../../api/builder.ts";
import { getNodes } from "../../api/pterodactyl.ts";
import { startPinger } from "../pinger.ts";
import { listPingAutocomplete } from "../../api/db.ts";

export default new Command({
  data: new SlashCommandBuilder()
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setName("editping")
    .setNameLocalizations({
      fr: "modifierping",
    })
    .setDescription("Edit the keys, the channel, or the name of a ping.")
    .setDescriptionLocalizations({
      fr: "Modifier les clés, le salon, ou le nom d'un ping",
    })
    .addNumberOption((option) =>
      option
        .setName("id")
        .setNameLocalizations({
          fr: "identifiant",
        })
        .setDescription("Ping's id")
        .setDescriptionLocalizations({
          fr: "Identifiant du ping",
        })
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("newname")
        .setNameLocalizations({
          fr: "nouveaunom",
        })
        .setDescription("Ping's new name")
        .setDescriptionLocalizations({
          fr: "Nouveau nom du ping",
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("appkey")
        .setDescription("The new app key (Admin / API Keys)")
        .setDescriptionLocalizations({
          fr: "La nouvelle clé d'application (Admin / API Keys)",
        })
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("clientkey")
        .setNameLocalizations({
          fr: "cleclient",
        })
        .setDescription("The new client key (Profile / API Keys)")
        .setDescriptionLocalizations({
          fr: "La nouvelle clé client (Profile / API Keys)",
        })
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({
          fr: "salon",
        })
        .setDescription("The new channel to associate with the ping")
        .setDescriptionLocalizations({
          fr: "Le nouveau salon à associer au ping",
        })
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        content: "Commande à utiliser dans un serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const id = interaction.options?.getNumber("id", true);
    const newName = interaction.options?.getString("newname")?.trim();
    const newAppKey = interaction.options?.getString("appkey")?.trim();
    const newClientKey = interaction.options?.getString("clientkey")?.trim();
    const newChannel = interaction.options?.getChannel("channel") ?? null;

    if (!newAppKey && !newClientKey && !newChannel && !newName) {
      await interaction.reply({
        content: "Aucun changement fourni.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ping = await getPing(id, guildId);
    if (!ping) {
      await interaction.reply({
        content: "Ping introuvable.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Vérifier nouvelle app key si fournie
    if (newAppKey) {
      const nodes = await getNodes(ping.base_url, newAppKey);
      if (!nodes) {
        await interaction.reply({
          content: "Nouvelle App Key invalide (échec accès nodes).",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    // Appliquer mises à jour
    const messageBuilder = new MessageBuilder();
    if (newName || newName === ping.name) {
      const ok = await updatePingName(ping.id, newName, guildId);
      if (!ok) {
        await interaction.reply({
          content: "Échec mise à jour du nom.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      messageBuilder.line("🏷️ Nom mis à jour");
      ping.name = newName;
    }

    if (newAppKey || newClientKey) {
      const ok = await updatePingCredentials(
        ping.id,
        guildId,
        newAppKey,
        newClientKey,
      );
      if (!ok) {
        await interaction.reply({
          content: "Échec mise à jour des clés.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (newAppKey) messageBuilder.line("🔑 App Key mise à jour");
      if (newClientKey) messageBuilder.line("🗝️ Client Key mise à jour");
    }

    if (newChannel) {
      if (ping.channel_id && ping.message_id) {
        const oldChannel = interaction.client.channels.cache.get(
          ping.channel_id,
        );
        if (!oldChannel || !oldChannel.isSendable()) return;
        const oldMessage = oldChannel?.messages.cache.get(ping.message_id);
        if (!oldMessage) return;
        await oldMessage.delete();
      }

      const ok = await setPingChannel(ping.id, newChannel.id, guildId);
      if (!ok) {
        await interaction.reply({
          content: "Échec mise à jour du salon.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      messageBuilder.line(`💬 Salon → <#${newChannel.id}>`);
    }

    // Redémarrer pinger si quelque chose change et qu'un channel est défini (après potentielle MAJ)
    if (
      (newAppKey || newClientKey || newChannel) &&
      (newChannel?.id || ping.channel_id)
    ) {
      await startPinger(interaction.client, ping.id, guildId);
    }

    const mb = new MessageBuilder()
      .line(`✏️ Modifications pour **${ping.name}**:`);
    if (messageBuilder.length() === 0) {
      mb.line("(Aucun changement appliqué)");
    } else {
      for (const l of messageBuilder.getLines()) mb.line(l);
    }

    await mb.reply(interaction, MessageFlags.Ephemeral);
  },

  async autocomplete(interaction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.respond([]);
      return;
    }

    await listPingAutocomplete(interaction);
  },
});
