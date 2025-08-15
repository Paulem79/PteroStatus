import { MessageFlags, SlashCommandBuilder } from "../../deps.ts";
import { Command } from "../handlers/commands.ts";
import {MessageBuilder} from "../../api/builder.ts";
import {PingSystem} from "../../api/network.ts";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get the bot's ping.")
    .setDescriptionLocalizations({
      fr: "Obtenir le ping du bot.",
    }),

  async execute(interaction) {
      const ping = new PingSystem(interaction);
      const message = new MessageBuilder()
          .line(`:ping_pong: Pong ! Le ping est de **${ping.total()}ms**`)
          .line(`Hébergement: **${ping.host()}ms**`)
          .line(`API: **${Math.max(ping.api(), 0)}ms**`);
    await message.reply(interaction, MessageFlags.Ephemeral)
  },
});
