import * as assert from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import { getNodes } from "../api/pterodactyl.ts";
import config from "../../config.json" with { type: "json" };

Deno.test({
  name: "request_panel",
  permissions: { env: true, net: true },
  fn: async () => {
    const hostname = Deno.env.get("HOSTNAME") ?? config.hostname;
    const apikey = Deno.env.get("APIKEY") ?? config.apikey;

    if (hostname == undefined || apikey == undefined) {
      console.error("Missing HOSTNAME or APIKEY in environment");
      return assert.assertEquals(true, false);
    }

    const nodes = await getNodes(hostname, apikey);
    assert.assertExists(nodes);
  },
});
