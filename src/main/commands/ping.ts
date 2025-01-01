import { SlashCommandBuilder } from "npm:@discordjs/builders@1.9.0";
import { Command } from "../handlers/commands.ts";

export default new Command({
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Get the bot's ping.")
    .setDescriptionLocalizations({
      fr: "Obtenir le ping du bot.",
    }),

  async execute(interaction) {
    await interaction.reply({
      content: `:ping_pong: Pong ! Le ping est de **${
        (Date.now() - interaction.createdTimestamp) * 2
      }ms**`,
      ephemeral: true,
    });
  },
});
