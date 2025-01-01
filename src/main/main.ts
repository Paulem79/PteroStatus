import {
  ButtonInteraction,
  Client,
  Collection,
  IntentsBitField,
} from "npm:discord.js@14.17.0";

import { getEvents } from "./handlers/events.ts";

import config from "../../config.json" with { type: "json" };
import { Command } from "./handlers/commands.ts";

import path from "node:path";
import { fileURLToPath } from "node:url";
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

export let commands: Command[] = [];
export let events: string[] = [];
export const cooldowns: Collection<string, Collection<string, number>> = new Collection();

export function setCommands(cmds: Command[]) {
  commands = cmds;
}

export async function defaultButtons(
  _interaction: ButtonInteraction<"cached">
) {}

(async () => {
  events = await getEvents(__dirname, "events", client);
})().catch((err) => {
  console.error(err);
});

client.login(config.token);
