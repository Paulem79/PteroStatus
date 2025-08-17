import { MessageFlags } from "../../deps.ts";
import { deletePing, getPing } from "../sql/requests.ts";
import { stopPinger } from "../pinger.ts";
import type { ChatInputCommandInteraction } from "../../deps.ts";

export async function subDelete(interaction: ChatInputCommandInteraction<"cached">) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral });
    return;
  }
  const id = interaction.options.getNumber("id", true);
  const ping = await getPing(id, guildId);
  if (!ping) {
    await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (ping.channel_id && ping.message_id) {
    const channel = interaction.client.channels.cache.get(ping.channel_id);
    if (channel && channel.isTextBased()) {
      try {
        const msg = await channel.messages.fetch(ping.message_id);
        await msg.delete().catch(() => {});
      } catch {
          // ignore
      }
    }
  }
  const success = await deletePing(ping.id, guildId);
  stopPinger(ping.id, guildId);
  if (!success) {
    await interaction.reply({ content: "Ce ping n'existe pas.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content: `Ping '${ping.name}' supprimé.`, flags: MessageFlags.Ephemeral });
}

