import { MessageFlags, SlashCommandBuilder } from "../../deps.ts";
import { Command } from "../handlers/commands.ts";
import {MessageBuilder} from "../../api/builder.ts";
import {PingSystem} from "../../api/network.ts";
import process from "node:process";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get the bot's ping.")
    .setDescriptionLocalizations({
      fr: "Obtenir le ping du bot.",
    })
    .addBooleanOption(o =>
      o
        .setName("public")
        .setDescription("Réponse visible par tous (sinon éphémère).")
    ),

  async execute(interaction) {
    const start = Date.now();

    const ping = new PingSystem(interaction);
    const total = ping.total();
    const host = ping.host();
    const api = ping.api();

    let mem: string | undefined;
    try {
      if (typeof Deno !== "undefined" && typeof Deno.memoryUsage === "function") {
        const { rss } = Deno.memoryUsage();
        mem = `${(rss / 1024 / 1024).toFixed(2)} MB`;
      } else if (typeof process !== "undefined" && process.memoryUsage) {
        const { rss } = process.memoryUsage();
        mem = `${(rss / 1024 / 1024).toFixed(2)} MB`;
      }
    } catch {
      /* ignore */
    }

    const buildTime = Date.now() - start;

    const message = new MessageBuilder()
      .line(`:ping_pong: Pong ! Latence totale: **${total}ms**`)
      .line(`Interne: **${host}ms** | API: **${api}ms**`)
      .line(`Construction du message: **${buildTime}ms**`)
      .line(`Mémoire RSS: **${mem ?? "Inconnue"}**`);

    const isPublic = interaction.options?.getBoolean?.("public") === true;
    const flags = isPublic ? undefined : MessageFlags.Ephemeral;

    await message.reply(interaction, flags);
  },
});