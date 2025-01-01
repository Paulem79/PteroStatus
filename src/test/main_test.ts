import { assertEquals } from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import { getNodes } from "../api/pterodactyl.ts";

Deno.test({
  name: "request",
  permissions: { env: true, read: true, net: true },
  fn: async () => {
    const hostname = Deno.env.get("HOSTNAME");
    const apikey = Deno.env.get("APIKEY");

    if (hostname == undefined || apikey == undefined)
      return assertEquals(true, false);

    const nodes = await getNodes(hostname, apikey);
    if (nodes != undefined) {
      nodes.data.forEach((node) => {
        console.log(`Node: ${node.attributes.name} (${node.attributes.uuid})`);
      });
    }
  },
});
