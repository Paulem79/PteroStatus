import { MessageFlags, SlashCommandBuilder } from "../../deps.ts";
import { Command } from "../handlers/commands.ts";
import { MessageBuilder } from "../../api/builder.ts";
import { LatencySystem } from "../../api/network.ts";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("latency")
    .setNameLocalizations({
      fr: "latence",
    })
    .setDescription("Get the bot's latency.")
    .setDescriptionLocalizations({
      fr: "Obtenir la latence du bot.",
    })
    .addBooleanOption((option) =>
      option
        .setName("public")
        .setNameLocalizations({
          fr: "publique",
        })
        .setDescription("Reply shown to everyone (otherwise ephemeral).")
        .setDescriptionLocalizations({
          fr: "Réponse visible par tous (sinon éphémère).",
        })
    ),

  async execute(interaction) {
    const ping = new LatencySystem(interaction);
    const total = ping.total();
    const host = ping.host();
    const api = ping.api();

    const message = new MessageBuilder()
      .line(`:ping_pong: Latence totale: **${total}ms**`)
      .line(`Interne: **${host}ms** | API: **${api}ms**`);

    const isPublic = interaction.options?.getBoolean?.("public") === true;
    const flags = isPublic ? undefined : MessageFlags.Ephemeral;

    await message.reply(interaction, flags);
  },
});
