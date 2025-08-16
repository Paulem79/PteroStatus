// noinspection JSUnusedGlobalSymbols

import { Command } from "../handlers/commands.ts";
import {
  ChannelType,
  InteractionContextType,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
} from "../../deps.ts";
import { getPing, setPingChannel } from "../sql/requests.ts";
import { MessageBuilder } from "../../api/builder.ts";
import { startPinger } from "../pinger.ts";

import {listPingAutocomplete} from "../../api/listPingAutocomplete.ts";

export default new Command({
  data: new SlashCommandBuilder()
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .setName("channel")
    .setNameLocalizations({
      fr: "salon",
    })
    .setDescription(
      "Associate a discord channel where the ping status will be sent.",
    )
    .setDescriptionLocalizations({
      fr: "Associer un salon Discord où le statut du ping sera envoyé.",
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
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setNameLocalizations({
          fr: "salon",
        })
        .setDescription("Discord channel to associate with the ping")
        .setDescriptionLocalizations({
          fr: "Salon Discord à associer au ping",
        })
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
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
    const channel = interaction.options?.getChannel("channel", true)!;

    const ping = await getPing(id, guildId);
    if (!ping) {
      await interaction.reply({
        content: "Ping introuvable.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if(ping.channel_id) {
        await interaction.reply({
            content: "Salon déjà défini pour ce ping. Utilisez `/editping` pour le modifier.",
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const ok = await setPingChannel(ping.id, channel.id, guildId);
    if (!ok) {
      await interaction.reply({
        content: "Impossible de mettre à jour le salon.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const mb = new MessageBuilder()
      .line(`🔗 Salon associé pour **${ping.name}** → <#${channel.id}>`);
    await mb.reply(interaction, MessageFlags.Ephemeral);

    await startPinger(interaction.client, ping.id, guildId);
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
