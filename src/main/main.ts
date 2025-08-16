import {ButtonInteraction, Client, Collection, IntentsBitField,} from "../deps.ts";

import {getEvents} from "./handlers/events.ts";

import config from "../../config.json" with {type: "json"};
import {Command} from "./handlers/commands.ts";

import path from "node:path";
import {fileURLToPath} from "node:url";

import mysql from 'npm:mysql2';
import {ensureTables} from "./sql/requests.ts";
import {getConnection, tryConnection} from "../api/db.ts";

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
export const cooldowns: Collection<string, Collection<string, number>> =
  new Collection();

export const connection = getConnection();

tryConnection(connection, () => {
    ensureTables().catch(e=>console.error("Erreur création tables", e));
});

export function setCommands(cmds: Command[]) {
  commands = cmds;
}

export async function defaultButtons(
  interaction: ButtonInteraction<"cached">,
) {
    const parts = interaction.customId.split('|');
    if(parts[0] == 'ps') {
        const module = await import("./commands/shownservers.ts")
        const command = module.default;
        if (!command || !command.button) return;
        command.button(interaction);
    } else if(parts[0] == 'pn') {
        const module = await import("./commands/shownnodes.ts")
        const command = module.default;
        if (!command || !command.button) return;
        command.button(interaction);
    }
}

// Masquage basique de clés dans les logs (patterns peli_ / plcn_) pour éviter fuite accidentelle
(function setupLogMasking(){
  if(Deno.env.get("LOG_MASK_DISABLE")) return;
  const secretRegex = /\b(peli_[A-Za-z0-9]+|plcn_[A-Za-z0-9]+)\b/g;
  function maskArg(a: unknown){
    if(typeof a === 'string') return a.replace(secretRegex, '[SECRET]');
    if(a && typeof a === 'object') {
      try { return JSON.stringify(a).replace(secretRegex, '[SECRET]'); } catch { return a; }
    }
    return a;
  }
  const wrap = (orig: (...args: unknown[])=>void)=> (...args: unknown[])=>{
    try {
      const masked = args.map(maskArg);
      orig.apply(console, masked);
    } catch { orig.apply(console, args); }
  };
  console.log = wrap(console.log);
  console.error = wrap(console.error);
  console.warn = wrap(console.warn);
})();

(async () => {
  events = await getEvents(__dirname, "events", client);
})().catch((err) => {
  console.error(err);
});

client.login(config.token);
