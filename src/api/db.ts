import mysql, { Connection } from "npm:mysql2";
import { AutocompleteInteraction, GuildChannel } from "../deps.ts";
import { listPings } from "../main/sql/requests.ts";
import { client } from "../main/main.ts";

export function getConnection(keepAlive = true) {
  return mysql.createConnection({
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
    enableKeepAlive: keepAlive,
    keepAliveInitialDelay: 0,
  });
}

export function tryConnection(connection: Connection, onSuccess?: () => void) {
  connection.connect((err) => {
    if (err) {
      console.error("Erreur de connexion à la base de données:", err);
    } else {
      console.log("Connecté à la base de données MySQL");
      if (onSuccess) onSuccess();
    }
  });
}

export async function listPingAutocomplete(
  interaction: AutocompleteInteraction<"cached">,
) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === "id") {
    const pings = await listPings(interaction.guildId);
    const filtered = pings
      .filter((p) => p.id.toString().includes(focused.value))
      .slice(0, 25)
      .map((p) => {
        const channel = p.channel_id
          ? client.channels.cache.get(p.channel_id)
          : undefined;
        const ch = channel && channel instanceof GuildChannel
          ? channel.name
          : "???";
        return { name: `${p.name} (#${ch})`, value: p.id };
      });
    await interaction.respond(filtered);
  }
}
