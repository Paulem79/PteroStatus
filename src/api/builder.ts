import {BitFieldResolvable, ChatInputCommandInteraction, MessageFlags} from "../deps.ts";

export class MessageBuilder {
  private lines: string[] = [];

  line(line: string): this {
    this.lines.push(line);
    return this;
  }

  build(): string {
    return this.lines.join('\n');
  }

  reply(interaction: ChatInputCommandInteraction<"cached">, flags?:
      BitFieldResolvable<"SuppressEmbeds" | "Ephemeral" | "SuppressNotifications" | "IsComponentsV2", MessageFlags.SuppressEmbeds | MessageFlags.Ephemeral | MessageFlags.SuppressNotifications | MessageFlags.IsComponentsV2> | undefined
  ) {
      return interaction.reply({content: this.build(), flags: flags});
  }
}