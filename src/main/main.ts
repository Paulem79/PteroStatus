import {ButtonInteraction, Client, Collection, IntentsBitField,} from "../deps.ts";

import {getEvents} from "./handlers/events.ts";

import config from "../../config.json" with {type: "json"};
import {Command} from "./handlers/commands.ts";

import path from "node:path";
import {fileURLToPath} from "node:url";

import mysql from 'npm:mysql2';
import {ensureTables} from "./sql/requests.ts";

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

export const connection = mysql.createConnection({
    host: Deno.env.get("DB_HOST"),
    user: Deno.env.get("DB_USER"),
    password: Deno.env.get("DB_PASSWORD"),
    database: Deno.env.get("DB_NAME"),
    port: parseInt(Deno.env.get("DB_PORT") ?? "3306"),
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

connection.connect((err) => {
  if (err) {
    console.error("Erreur de connexion à la base de données:", err);
  } else {
    console.log("Connecté à la base de données MySQL");
    ensureTables().catch(e=>console.error("Erreur création tables", e));
  }
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

(async () => {
  events = await getEvents(__dirname, "events", client);
})().catch((err) => {
  console.error(err);
});

client.login(config.token);
