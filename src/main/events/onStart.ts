import { Events } from "npm:discord.js@14.16.3";

import { HandledEvent } from "../handlers/events.ts";
import { __dirname, setCommands } from "../main.ts";
import { getCommands } from "../handlers/commands.ts";

export default {
  once: true,

  async listener(client) {
    setCommands(await getCommands(__dirname, "commands", client));

    setInterval(() => {
      client.user.setActivity(`des livres audios`, {
        type: 2,
      });
    }, 10000);

    console.log(`Ready! Logged in as ${client.user.tag}`);
  },

  eventType: Events.ClientReady,
} as HandledEvent<Events.ClientReady>;
