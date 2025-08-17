import { MessageFlags } from "../../deps.ts";
import { createPing } from "../sql/requests.ts";
import { getNodes } from "../../api/pterodactyl.ts";
import { MessageBuilder } from "../../api/builder.ts";
import type { ChatInputCommandInteraction } from "../../deps.ts";

export async function subCreate(interaction: ChatInputCommandInteraction<"cached">) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "Commande à utiliser dans un serveur.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  const name = interaction.options.getString("name", true)?.trim();
  let baseurl = interaction.options.getString("baseurl", true).trim();
  const appkey = interaction.options.getString("appkey", true).trim();
  const clientkey = interaction.options.getString("clientkey", true).trim();

  if (!baseurl.includes("http") && !baseurl.includes("://")) {
    baseurl = `https://${baseurl}`;
  }
  if (baseurl.endsWith("/")) baseurl = baseurl.slice(0, -1);

  if (name.length > 64) {
    await interaction.reply({
      content: "Nom trop long (64 max).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const nodes = await getNodes(baseurl, appkey);
  if (!nodes) {
    await interaction.reply({
      content: "Impossible d'accéder à l'API (vérifiez l'URL / appkey).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ok = await createPing(name, baseurl, appkey, clientkey, guildId);
  if (!ok) {
    await interaction.reply({
      content: "Échec création (doublon?).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const mb = new MessageBuilder()
    .line(`✅ Ping créé: **${name}**`)
    .line(`URL: ${baseurl}`)
    .line(`Nodes détectés: ${nodes.meta?.pagination?.total ?? nodes.data?.length ?? 0}`)
    .line(`Associez un salon avec /ping channel`);

  await mb.reply(interaction, MessageFlags.Ephemeral);
}

