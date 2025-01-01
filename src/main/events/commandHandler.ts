import { Collection, Events } from "npm:discord.js@14.17.0";

import { HandledEvent } from "../handlers/events.ts";
import { commands, cooldowns, defaultButtons } from "../main.ts";

const defaultCooldownDuration = 3;

export default {
  async listener(interaction) {
    if (interaction.isChatInputCommand()) {
      if (!interaction.inCachedGuild())
        return await interaction.reply({
          content: "Vous ne pouvez pas faire ceci !",
          ephemeral: true,
        });

      const slashCommand = commands.find(
        (c) => c.data.name === interaction.commandName
      );
      if (!slashCommand) {
        interaction.reply({
          content: "Une erreur est survenue !",
          ephemeral: true,
        });
        return;
      }

      if (!cooldowns.has(slashCommand.data.name)) {
        cooldowns.set(slashCommand.data.name, new Collection());
      }

      const now = Date.now();
      const timestamps = cooldowns.get(slashCommand.data.name);

      if (timestamps == undefined) return;

      const cooldownAmount =
        (slashCommand.attributes
          ? slashCommand.attributes.cooldown ?? defaultCooldownDuration
          : defaultCooldownDuration) * 1000;

      if (timestamps.has(interaction.user.id)) {
        const expirationTime =
          (timestamps.get(interaction.user.id) ?? 0) + cooldownAmount;

        if (now < expirationTime) {
          const expiredTimestamp = Math.round(expirationTime / 1000);
          await interaction.reply({
            content: `Veuillez attendre <t:${expiredTimestamp}:R> pour réutiliser \`/${slashCommand.data.name}\``,
            ephemeral: true,
          });
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        slashCommand.interaction = interaction;
        return await slashCommand.execute(interaction);
      } catch (err) {
        await interaction.reply({
          content: "Une erreur est survenue !",
          ephemeral: true,
        });
        console.log(err);
        return;
      }
    } else if (interaction.isAutocomplete()) {
      if (!interaction.inCachedGuild()) return;

      const slashCommand = commands.find(
        (c) => c.data.name === interaction.commandName
      );

      if (slashCommand == undefined || slashCommand.autocomplete == undefined)
        return;

      try {
        await slashCommand.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isAnySelectMenu()) {
      if (interaction.message.interactionMetadata == undefined) return;
      if (!interaction.inCachedGuild())
        return await interaction.reply({
          content: "Vous ne pouvez pas faire ceci !",
          ephemeral: true,
        });

      const slashCommand = commands.find(
        (c) => c.data.name === interaction.message.interactionMetadata?.id
      );

      if (slashCommand == undefined || slashCommand.selectmenu == undefined)
        return await interaction.reply({
          content: "Une erreur est survenue !",
          ephemeral: true,
        });

      try {
        await slashCommand.selectmenu(interaction);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.message?.interactionMetadata == undefined) return;
      if (!interaction.inCachedGuild())
        return await interaction.reply({
          content: "Vous ne pouvez pas faire ceci !",
          ephemeral: true,
        });

      const slashCommand = commands.find(
        (c) => c.data.name === interaction.message?.interactionMetadata?.id
      );

      if (slashCommand == undefined || slashCommand.modal == undefined)
        return await interaction.reply({
          content: "Une erreur est survenue !",
          ephemeral: true,
        });

      try {
        await slashCommand.modal(interaction);
      } catch (error) {
        console.error(error);
      }
    } else if (interaction.isButton()) {
      if (!interaction.inCachedGuild())
        return await interaction.reply({
          content: "Vous ne pouvez pas faire ceci !",
          ephemeral: true,
        });
      if (interaction.message.interactionMetadata == undefined)
        return defaultButtons(interaction);

      const slashCommand = commands.find(
        (c) => c.data.name === interaction.message.interactionMetadata?.id
      );

      if (slashCommand == undefined || slashCommand?.button == undefined)
        return defaultButtons(interaction);

      try {
        await slashCommand.button(interaction);
      } catch (error) {
        console.error(error);
      }
    }
  },
  eventType: Events.InteractionCreate,
} as HandledEvent<Events.InteractionCreate>;
