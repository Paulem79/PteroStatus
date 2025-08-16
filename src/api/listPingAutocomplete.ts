import { AutocompleteInteraction, GuildChannel } from "npm:discord.js@14.21.0";
import { listPings } from "../main/sql/requests.ts";
import { client } from "../main/main.ts";

export async function listPingAutocomplete(
  interaction: AutocompleteInteraction<"cached">,
) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === "id") {
    const pings = await listPings(interaction.guildId);
    const filtered = pings
      .filter((p) => p.id.toString().includes(focused.value))
      .slice(0, 25)
      .map((p) => {
        const channel = p.channel_id
          ? client.channels.cache.get(p.channel_id)
          : undefined;
        const ch = channel && channel instanceof GuildChannel
          ? channel.name
          : "???";
        return { name: `${p.name} (#${ch})`, value: p.id };
      });
    await interaction.respond(filtered);
  }
}
