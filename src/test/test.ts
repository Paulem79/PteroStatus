import * as assert from "jsr:@std/assert";
import "jsr:@std/dotenv/load";
import { getNodes, getServer } from "../api/pterodactyl.ts";
import { getConnection, tryConnection } from "../api/db.ts";
import { assertFalse } from "jsr:@std/assert/false";

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

    if (
      hostname == undefined || apikey == undefined || server_id == undefined
    ) {
      console.error(
        "Missing environment variables: HOSTNAME, USER_APIKEY, or PTE_PANEL_ID",
      );
      return assert.assertEquals(true, false);
    }

    const server = await getServer(hostname, apikey, server_id);

    assert.assertFalse(server?.attributes.is_installing);
  },
});

Deno.test({
  name: "connect_db",
  permissions: { env: true, net: true, read: true },
  fn: async () => {
    const conn = getConnection(false);
    let connected = false;
    let timer: number | undefined;
    try {
      await new Promise<void>((resolve, reject) => {
        const timeoutMs = 10000;
        const onTimeout = () => {
          timer = undefined;
          reject(new Error("Timeout connexion DB"));
        };
        timer = setTimeout(onTimeout, timeoutMs);

        function cleanup() {
          if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
          }
        }

        tryConnection(conn, () => {
          connected = true;
          cleanup();
          resolve();
        });
      });
      assertFalse(!connected);
    } finally {
      if (
        conn &&
        typeof (conn as unknown as ConnectionCloseable).close === "function"
      ) {
        try {
          await (conn as unknown as ConnectionCloseable).close();
        } catch {
          // ignore
        }
      }
    }
  },
});

interface ConnectionCloseable {
  close: () => Promise<void>;
}
