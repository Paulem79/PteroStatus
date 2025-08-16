import {Nodes, ServerResources, ServerResponse, SingleNode} from "./pterodactyl_types.ts";

export async function getNodes(
  hostname: string,
  user_apikey: string,
): Promise<Nodes | undefined> {
  try {
    const response = await fetch(`${hostname}/api/application/nodes`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${user_apikey}`,
      },
      credentials: "include",
    });
    const data = (await response.json()) as Nodes;

    if (data?.errors) return undefined;

    return data;
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export async function getNode(
    hostname: string,
    appkey: string,
    nodeId: number,
): Promise<SingleNode | undefined> {
    try {
        const response = await fetch(`${hostname}/api/application/nodes/${nodeId}?include=allocations,location,servers`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${appkey}`,
            },
            credentials: "include",
        });
        const data = (await response.json());

        if (data?.errors) return undefined;

        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function getServer(
    hostname: string,
    user_apikey: string,
    server_id: string,
): Promise<ServerResponse | undefined> {
    try {
        const response = await fetch(
            `${hostname}/api/client/servers/${server_id}`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user_apikey}`,
                },
                credentials: "include",
            },
        );
        const data = (await response.json()) as ServerResponse;

        console.log(data);

        if (data?.errors) return undefined;

        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}

export async function getResources(
    hostname: string,
    user_apikey: string,
    serverId: string,
): Promise<ServerResources | undefined> {
    try {
        const response = await fetch(
            `${hostname}/api/client/servers/${serverId}/resources`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${user_apikey}`,
                },
                credentials: "include",
            },
        );
        const data = (await response.json()) as ServerResources;

        if (data?.errors) return undefined;

        return data;
    } catch (error) {
        console.error(error);
        return undefined;
    }
}
