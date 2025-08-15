import {BitFieldResolvable, ChatInputCommandInteraction, MessageFlagsString} from "npm:discord.js@14.12.1";

export class MessageBuilder {
  private lines: string[] = [];

  line(line: string): this {
    this.lines.push(line);
    return this;
  }

  build(): string {
    return this.lines.join('\n');
  }

  reply(interaction: ChatInputCommandInteraction<"cached">, flags?: BitFieldResolvable<
      Extract<MessageFlagsString, 'Ephemeral' | 'SuppressEmbeds'>,
      MessageFlags.Ephemeral | MessageFlags.SuppressEmbeds
  >) {
      return interaction.reply({content: this.build(), flags: flags});
  }
}