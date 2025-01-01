import * as assert from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import { Client, IntentsBitField } from "npm:discord.js@14.16.3";

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

Deno.test({
  name: "bot",
  permissions: { env: true, read: true, net: true },
  fn: () => {
    const token = Deno.env.get("TOKEN");

    if (token == undefined) {
      console.error("Missing TOKEN in environment");
      return assert.assertFalse(true);
    }

    client
      .login(token)
      .then(() => {
        client.destroy();
        assert.assertFalse(false);
      })
      .catch((error) => {
        console.error(error);
        assert.assertFalse(true);
      });
  },
});
