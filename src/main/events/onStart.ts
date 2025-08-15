import { Events } from "../../deps.ts";

import { HandledEvent } from "../handlers/events.ts";
import { __dirname, setCommands } from "../main.ts";
import { getCommands } from "../handlers/commands.ts";

export default {
  once: true,

  async listener(client) {
    setCommands(await getCommands(__dirname, "commands", client));

    setInterval(() => {
      client.user.setActivity(`${client.guilds.cache.size} serveur(s)`, {
        type: 2,
      });
    }, 10000);

    console.log(`Prêt! Connecté en tant que ${client.user.tag}`);
  },

  eventType: Events.ClientReady,
} as HandledEvent<Events.ClientReady>;
