import { MessageFlags, ChannelType } from "../../deps.ts";
import { getPing, setPingChannel } from "../sql/requests.ts";
import { MessageBuilder } from "../../api/builder.ts";
import { startPinger } from "../pinger.ts";
import type { ChatInputCommandInteraction } from "../../deps.ts";

export async function subChannel(interaction: ChatInputCommandInteraction<"cached">) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }
  const id = interaction.options.getNumber("id", true);
  const channel = interaction.options.getChannel("channel", true)!;
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "Salon invalide.", flags: MessageFlags.Ephemeral });
    return;
  }
  const ping = await getPing(id, guildId);
  if (!ping) {
    await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (ping.channel_id) {
    await interaction.reply({ content: "Salon déjà défini pour ce ping. Utilisez `/ping edit` pour le modifier.", flags: MessageFlags.Ephemeral });
    return;
  }
  const ok = await setPingChannel(ping.id, channel.id, guildId);
  if (!ok) {
    await interaction.reply({ content: "Impossible de mettre à jour le salon.", flags: MessageFlags.Ephemeral });
    return;
  }
  const mb = new MessageBuilder().line(`🔗 Salon associé pour **${ping.name}** → <#${channel.id}>`);
  await mb.reply(interaction, MessageFlags.Ephemeral);
  await startPinger(interaction.client, ping.id, guildId);
}

