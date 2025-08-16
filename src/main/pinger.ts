import {Colors, EmbedBuilder} from "../deps.ts";
import {Client} from "../deps.ts";
import {getAllPings, setPingMessageId} from "./sql/requests.ts";
import {getNodes, getNode, getResources} from "../api/pterodactyl.ts";
import {ServerResponse, ServerState} from "../api/pterodactyl_types.ts";
import {client} from "./main.ts";
import {MessageBuilder} from "../api/builder.ts";

interface RunningPing { interval: number; }

const running: Map<string, RunningPing> = new Map(); // key = guildId:name

export async function startAllPingers(client: Client<true>) {
    const pings = await getAllPings();
    for (const p of pings) {
        if (p.channel_id) await startPinger(client, p.name, p.guild_id || undefined);
    }
}

export async function startPinger(client: Client<true>, name: string, guildId?: string) {
    const key = `${guildId || 'global'}:${name}`;
    stopPinger(name, guildId);
    const pings = await getAllPings();
    const ping = pings.find(p=>p.name===name && (guildId ? p.guild_id === guildId : true));
    if(!ping || !ping.channel_id) return;
    const channel = client.channels.cache.get(ping.channel_id!);
    if(!channel || !channel.isTextBased() || !channel.isSendable()) return;

    let messageId = ping.message_id;
    try {
        if(messageId) await channel.messages.fetch(messageId); // vérifie existence
    } catch { /* message supprimé */ }

    if(!messageId) {
        const sent = await channel.send({ content: `Initialisation du statut (${name})...` });
        messageId = sent.id;
        await setPingMessageId(name, messageId, guildId);
    }

    try {
        messageId = await updatePingMessage(ping.name, client, messageId!, guildId);
    } catch(e) {
        console.error(e);
    }

    const interval = setInterval(async ()=>{
        try {
            messageId = await updatePingMessage(ping.name, client, messageId!, guildId);
        } catch(e) {
            console.error("Update ping erreur", e);
        }
    }, 10_000);
    running.set(key, { interval: interval as unknown as number });
}

export function stopPinger(name: string, guildId?: string) {
    const key = `${guildId || 'global'}:${name}`;
    const r = running.get(key);

    if(r) {
        clearInterval(r.interval);
        running.delete(key);
    }
}

export async function triggerPingUpdate(client: Client<true>, name: string, guildId?: string) {
    const pings = await getAllPings();
    const ping = pings.find(p=>p.name===name && (guildId ? p.guild_id === guildId : true));
    if(!ping || !ping.message_id) return;
    await updatePingMessage(name, client, ping.message_id, guildId);
}

async function updatePingMessage(name: string, client: Client<true>, messageId: string, guildId?: string): Promise<string> {
    const pings = await getAllPings();

    const ping = pings.find(p=>p.name===name && (guildId ? p.guild_id === guildId : true));
    if(!ping || !ping.channel_id) return messageId;

    const channel = client.channels.cache.get(ping.channel_id);
    if(!channel || !channel.isTextBased() || !channel.isSendable()) return messageId;

    let message;
    try {
        message = await channel.messages.fetch(messageId);
    } catch {
        const sent = await channel.send({ content: `Recréation du statut (${name})...` });
        await setPingMessageId(name, sent.id, guildId);
        message = sent;
        messageId = sent.id; // mise à jour pour les prochains cycles
    }

    const embed = new EmbedBuilder()
        .setTitle(`Statut ${name}`)
        .setColor(Colors.Blurple)
        .setTimestamp();

    const nodes = await getNodes(ping.base_url, ping.app_key);
    if(!nodes) {
        embed.setDescription("Impossible de récupérer les nodes (la clé d'API de l'application est-elle correcte ?).");
        embed.setColor(Colors.Red);

        await message.edit({ content: "", embeds: [embed] });
        return messageId;
    }

    let nodeIdsFilter: number[] | null = null;
    if(ping.nodes_filter) {
        try {
            nodeIdsFilter = JSON.parse(ping.nodes_filter);
        } catch {
            console.error("Erreur de parsing des IDs de nodes pour le ping", name, ping.nodes_filter);

            embed.setDescription("Erreur de parsing des IDs de nodes.");
            embed.setColor(Colors.Red);

            await message.edit({ content: "", embeds: [embed] });
            return messageId;
        }
    }

    for(const raw of nodes.data) {
        const id = raw.attributes.id as number;
        if(nodeIdsFilter && !nodeIdsFilter.includes(id)) continue;

        const node = await getNode(ping.base_url, ping.app_key, id);
        if(!node) {
            embed.addFields({ name: `Node ${raw.attributes.name}`, value: `En Ligne ${await stateToEmoji("stopping")}` });
            continue;
        }

        const rel = node.attributes.relationships;
        const servers = (rel?.servers?.data ?? []) as ServerResponse[];

        let serversFilter: (string|number)[] | null = null;
        if(ping.servers_filter) {
            try {
                serversFilter = JSON.parse(ping.servers_filter);
            } catch { /* filtre serveur invalide ignoré */ }
        }

        const serverMessage = new MessageBuilder();
        for(const server of servers) {
            const attrs = server.attributes ?? {};
            const sid = attrs.uuid;

            if(serversFilter && !serversFilter.includes(sid)) continue;

            const resources = sid ? await getResources(ping.base_url, ping.client_key, sid) : undefined;

            if(!resources) {
                embed.setDescription("Clé d'API client invalide.");
                embed.setColor(Colors.Red);

                await message.edit({ content: "", embeds: [embed] });
                return messageId;
            }

            const state = await stateToEmoji(resources?.attributes.current_state ?? "offline");

            serverMessage.line(`• ${attrs.name ?? sid} ${state}`);

            if(serverMessage.length() >= 12) {
                serverMessage.line("…");
                break;
            }
        }

        if(serverMessage.length() === 0) serverMessage.line(`En Ligne ${await stateToEmoji("running")}`);

        embed.addFields({ name: `Node ${node.attributes.name}`, value: serverMessage.build() });
    }

    await message.edit({ content: "", embeds: [embed] });
    return messageId;
}

function stateToEmoji(state: ServerState) {
    switch (state) {
        case "offline":
            return client.application?.emojis.fetch("1406313068736020643");
        case "starting":
            return client.application?.emojis.fetch("1406313080404709528");
        case "running":
            return client.application?.emojis.fetch("1406313041913577627");
        case "stopping":
            return client.application?.emojis.fetch("1406313080404709528");
    }
}
