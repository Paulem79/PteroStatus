import * as assert from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import {getNodes, getServer} from "../api/pterodactyl.ts";

Deno.test({
    name: "request_panel",
    permissions: { env: true, net: true },
    fn: async () => {
        const hostname = Deno.env.get("HOSTNAME");
        const apikey = Deno.env.get("USER_APIKEY");

        if (hostname == undefined || apikey == undefined) {
            console.error("Missing environment variables: HOSTNAME, or USER_APIKEY");
            return assert.assertEquals(true, false);
        }

        const nodes = await getNodes(hostname, apikey);
        assert.assertExists(nodes);
    },
});

Deno.test({
    name: "request_server",
    permissions: { env: true, net: true },
    fn: async () => {
        const hostname = Deno.env.get("HOSTNAME");
        const apikey = Deno.env.get("USER_APIKEY");
        const server_id = Deno.env.get("PTE_PANEL_ID");

        if (hostname == undefined || apikey == undefined || server_id == undefined) {
            console.error("Missing environment variables: HOSTNAME, USER_APIKEY, or PTE_PANEL_ID");
            return assert.assertEquals(true, false);
        }

        const server = await getServer(hostname, apikey, server_id);

        assert.assertFalse(server?.attributes.is_installing)
    },
});
