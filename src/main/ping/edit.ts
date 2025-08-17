import { MessageFlags, ChannelType } from "../../deps.ts";
import { getPing, setPingChannel, updatePingCredentials, updatePingName } from "../sql/requests.ts";
import { MessageBuilder } from "../../api/builder.ts";
import { getNodes } from "../../api/pterodactyl.ts";
import { startPinger } from "../pinger.ts";
import type { ChatInputCommandInteraction } from "../../deps.ts";

export async function subEdit(interaction: ChatInputCommandInteraction<"cached">) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }
  const id = interaction.options.getNumber("id", true);
  const newName = interaction.options.getString("newname")?.trim();
  const newAppKey = interaction.options.getString("appkey")?.trim();
  const newClientKey = interaction.options.getString("clientkey")?.trim();
  const newChannel = interaction.options.getChannel("channel") ?? null;

  if (!newAppKey && !newClientKey && !newChannel && !newName) {
    await interaction.reply({ content: "Aucun changement fourni.", flags: MessageFlags.Ephemeral });
    return;
  }
  const ping = await getPing(id, guildId);
  if (!ping) {
    await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (newAppKey) {
    const nodes = await getNodes(ping.base_url, newAppKey);
    if (!nodes) {
      await interaction.reply({ content: "Nouvelle App Key invalide (échec accès nodes).", flags: MessageFlags.Ephemeral });
      return;
    }
  }
  const messageBuilder = new MessageBuilder();
  if (newName || newName === ping.name) {
    const ok = await updatePingName(ping.id, newName, guildId);
    if (!ok) {
      await interaction.reply({ content: "Échec mise à jour du nom.", flags: MessageFlags.Ephemeral });
      return;
    }
    messageBuilder.line("🏷️ Nom mis à jour");
    ping.name = newName;
  }
  if (newAppKey || newClientKey) {
    const ok = await updatePingCredentials(ping.id, guildId, newAppKey, newClientKey);
    if (!ok) {
      await interaction.reply({ content: "Échec mise à jour des clés.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (newAppKey) messageBuilder.line("🔑 App Key mise à jour");
    if (newClientKey) messageBuilder.line("🗝️ Client Key mise à jour");
  }
  if (newChannel) {
    if (newChannel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Salon invalide.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (ping.channel_id && ping.message_id) {
      const oldChannel = interaction.client.channels.cache.get(ping.channel_id);
      if (oldChannel && oldChannel.isSendable()) {
        try {
          const oldMessage = await oldChannel.messages.fetch(ping.message_id);
          await oldMessage.delete();
        } catch {
            // ignore
        }
      }
    }
    const ok = await setPingChannel(ping.id, newChannel.id, guildId);
    if (!ok) {
      await interaction.reply({ content: "Échec mise à jour du salon.", flags: MessageFlags.Ephemeral });
      return;
    }
    messageBuilder.line(`💬 Salon → <#${newChannel.id}>`);
  }
  if ((newAppKey || newClientKey || newChannel) && (newChannel?.id || ping.channel_id)) {
    await startPinger(interaction.client, ping.id, guildId);
  }
  const mb = new MessageBuilder().line(`✏️ Modifications pour **${ping.name}**:`);
  if (messageBuilder.length() === 0) mb.line("(Aucun changement appliqué)"); else for (const l of messageBuilder.getLines()) mb.line(l);
  await mb.reply(interaction, MessageFlags.Ephemeral);
}

