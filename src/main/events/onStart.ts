// noinspection JSUnusedGlobalSymbols

import { ActivityType, Events } from "../../deps.ts";

import { HandledEvent } from "../handlers/events.ts";
import { __dirname, setCommands } from "../main.ts";
import { getCommands } from "../handlers/commands.ts";
import { startAllPingers } from "../pinger.ts";

export default {
  once: true,

  async listener(client) {
    setCommands(await getCommands(__dirname, "commands", client));

    client.user.setActivity(`${client.guilds.cache.size} serveur(s)`, {
      type: ActivityType.Listening,
    });

    console.log(`Prêt! Connecté en tant que ${client.user.tag}`);

    await startAllPingers(client);
  },

  eventType: Events.ClientReady,
} as HandledEvent<Events.ClientReady>;
