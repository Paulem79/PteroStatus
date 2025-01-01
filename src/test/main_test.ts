import "jsr:@std/dotenv/load";
import { getNodes } from "../api/pterodactyl.ts";

Deno.test("request", async () => {
  const nodes = await getNodes(
    Deno.env.get("HOSTNAME"),
    Deno.env.get("APIKEY")
  );
  if (nodes != undefined) {
    nodes.data.forEach((node) => {
      console.log(`Node: ${node.attributes.name} (${node.attributes.uuid})`);
    });
  }
});
