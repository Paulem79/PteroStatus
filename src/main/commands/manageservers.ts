import {Command} from "../handlers/commands.ts";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder
} from "../../deps.ts";
import {getPing, listPings, PingRow, updatePingServersFilter} from "../sql/requests.ts";
import {getNode, getNodes} from "../../api/pterodactyl.ts";
import {startPinger, triggerPingUpdate} from "../pinger.ts";
import {NodeAttributes, SingleNode} from "../../api/pterodactyl_types.ts";

// Cache des nodes et serveurs (30s)
const nodeCache = new Map<string, { at: number; nodes: NodeAttributes[] }>();

interface ServerMini { uuid?: string; identifier?: string; id?: number; name?: string; }

function extractServers(node: SingleNode): ServerMini[] {
    const rel = node.attributes.relationships;
    const raw = rel?.servers?.data ?? [];
    // Chaque entrée est supposée avoir attributes
    return raw.map((server) => server.attributes as ServerMini).filter(Boolean);
}

function serverKey(serverMini: ServerMini): string {
    return (serverMini.uuid || serverMini.identifier || (serverMini.id != null ? String(serverMini.id) : "unknown")) as string;
}

const PAGE_SIZE_SERVERS = 25;

function buildServersEmbed(ping: PingRow, nodeId: number, servers: ServerMini[], included: string[], page: number) {
    const totalPages = Math.max(1, Math.ceil(servers.length / PAGE_SIZE_SERVERS));
    const slice = servers.slice(page * PAGE_SIZE_SERVERS, page * PAGE_SIZE_SERVERS + PAGE_SIZE_SERVERS);
    const embed = new EmbedBuilder()
        .setTitle(`Gestion des serveurs • ${ping.name} • Node #${nodeId}`)
        .setDescription(`Cliquez sur un bouton pour inclure / exclure un serveur du filtre. Page ${page+1}/${totalPages}`)
        .setTimestamp();
    if (slice.length === 0) {
        embed.addFields({ name: "Aucun serveur", value: "La liste est vide." });
        return embed;
    }
    for (const s of slice) {
        const key = serverKey(s);
        const inside = included.includes(key);
        embed.addFields({ name: s.name || key, value: inside ? "✅ Inclus" : "❌ Exclu", inline: true });
    }
    return embed;
}

function buildServerButtons(servers: ServerMini[], included: string[], ping: PingRow, guildId: string, nodeId: number, page: number) {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const totalPages = Math.max(1, Math.ceil(servers.length / PAGE_SIZE_SERVERS));
    const slice = servers.slice(page * PAGE_SIZE_SERVERS, page * PAGE_SIZE_SERVERS + PAGE_SIZE_SERVERS).slice(0,25); // sécurité
    let current: ButtonBuilder[] = [];
    for (const server of slice) {
        const key = serverKey(server);
        const inside = included.includes(key);
        const btn = new ButtonBuilder()
            .setCustomId(`ps|s|${guildId}|${ping.id}|${nodeId}|${key}`)
            .setLabel(server.name ? (server.name.length > 15 ? server.name.slice(0,12)+"…" : server.name) : key.slice(0,15))
            .setStyle(inside ? ButtonStyle.Primary : ButtonStyle.Secondary);
        current.push(btn);
        if (current.length === 5) { rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...current)); current = []; }
    }
    if(current.length) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...current));
    if(totalPages > 1){
        const nav: ButtonBuilder[] = [];
        nav.push(new ButtonBuilder().setCustomId(`ps|p|${guildId}|${ping.id}|${nodeId}|${Math.max(0, page-1)}`).setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page===0));
        nav.push(new ButtonBuilder().setCustomId('ps|noop').setLabel(`Page ${page+1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true));
        nav.push(new ButtonBuilder().setCustomId(`ps|p|${guildId}|${ping.id}|${nodeId}|${Math.min(totalPages-1, page+1)}`).setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page===totalPages-1));
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...nav));
    }
    return rows.slice(0,5);
}

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("manageservers")
        .setNameLocalizations({
            fr: "gererserveurs"
        })
        .setDescription("Show and manage servers of a node associated to a ping.")
        .setDescriptionLocalizations({
            fr: "Afficher et gérer les serveurs d'un node associé à un ping."
        })
        .addNumberOption(option =>
            option
                .setName("id")
                .setNameLocalizations({
                    fr: "identifiant"
                })
                .setDescription("Ping's id")
                .setDescriptionLocalizations({
                    fr: "Identifiant du ping"
                })
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addIntegerOption(option=>
            option
                .setName("nodeid")
                .setNameLocalizations({
                    fr: "idnode"
                })
                .setDescription("Node's ID")
                .setDescriptionLocalizations({
                    fr: "ID du node"
                })
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){ await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral}); return; }
        const id = interaction.options?.getNumber("id", true);
        const nodeId = interaction.options?.getInteger("nodeid", true)!;
        const ping = await getPing(id, guildId);
        if(!ping){ await interaction.reply({content: "Ping introuvable.", flags: MessageFlags.Ephemeral}); return; }

        const node = await getNode(ping.base_url, ping.app_key, nodeId);
        if(!node){ await interaction.reply({content:"Node introuvable.", flags: MessageFlags.Ephemeral}); return; }

        const servers = extractServers(node);
        const included = ping.servers_filter ? JSON.parse(ping.servers_filter) as string[] : [];
        const page = 0;
        const embed = buildServersEmbed(ping, nodeId, servers, included, page);
        const components = buildServerButtons(servers, included, ping, guildId, nodeId, page);
        await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral });
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const guildId = interaction.guildId;
        if(!guildId){
            await interaction.respond([]);
            return;
        }

        if(focused.name === 'id') {
            const pings = await listPings(guildId);
            const filtered = pings
                .filter(p=> p.id.toString().includes(focused.value))
                .slice(0,25)
                .map(p=>({ name:p.name,value:p.id }));
            await interaction.respond(filtered);
            return;
        }

        if(focused.name === 'nodeid') {
            const id = interaction.options.getNumber('id', true);
            if(!id){
                await interaction.respond([]);
                return;
            }
            const ping = await getPing(id, guildId);
            if(!ping){ await interaction.respond([]); return; }
            const cacheKey = `${guildId}:${ping.name}`;
            const now = Date.now();
            let entry = nodeCache.get(cacheKey);
            if(!entry || (now - entry.at) > 30_000) {
                const nodes = await getNodes(ping.base_url, ping.app_key);
                if(!nodes){ await interaction.respond([]); return; }
                entry = { at: now, nodes: nodes.data.map(n=>n.attributes) };
                nodeCache.set(cacheKey, entry);
            }
            const valueStr = focused.value.toString().toLowerCase();
            const suggestions = entry.nodes
                .filter(n=> valueStr === '' || n.id.toString().includes(valueStr) || n.name.toLowerCase().includes(valueStr))
                .slice(0,25)
                .map(n=>({ name: `${n.name} (#${n.id})`, value: n.id }));
            await interaction.respond(suggestions);
        }
    },

    async button(interaction){
        const parts = interaction.customId.split('|');
        if(parts[0] !== 'ps') return;
        if(parts[1] === 'noop'){ await interaction.deferUpdate(); return; }
        if(parts[1] === 'p') {
            const [, , guildId, nameId, nodeIdRaw, pageRaw] = parts;
            const id = Number(nameId);

            if(interaction.guildId !== guildId){
                await interaction.reply({ content: "Contexte invalide.", flags: MessageFlags.Ephemeral  });
                return;
            }

            const nodeId = Number(nodeIdRaw);
            const ping = await getPing(id, guildId);
            if(!ping){ await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral  }); return; }
            const node = await getNode(ping.base_url, ping.app_key, nodeId);
            if(!node){ await interaction.reply({ content: "Node introuvable.", flags: MessageFlags.Ephemeral  }); return; }
            const servers = extractServers(node);
            const included = ping.servers_filter ? JSON.parse(ping.servers_filter) as string[] : [];
            const page = Number(pageRaw);
            const embed = buildServersEmbed(ping, nodeId, servers, included, page);
            const components = buildServerButtons(servers, included, ping, guildId, nodeId, page);
            try { await interaction.update({ embeds:[embed], components }); } catch { await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral  }); }
            return;
        }
        if(parts[1] === 's') {
            const [, , guildId, nameId, nodeIdRaw, serverKeyToggle] = parts;
            const id = Number(nameId);
            if(interaction.guildId !== guildId){ await interaction.reply({ content: "Contexte invalide.", flags: MessageFlags.Ephemeral  }); return; }
            const nodeId = Number(nodeIdRaw);
            const ping = await getPing(id, guildId);
            if(!ping){ await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral  }); return; }
            const node = await getNode(ping.base_url, ping.app_key, nodeId);
            if(!node){ await interaction.reply({ content: "Node introuvable.", flags: MessageFlags.Ephemeral  }); return; }
            const servers = extractServers(node);
            let current = ping.servers_filter ? JSON.parse(ping.servers_filter) as string[] : [];
            if(current.includes(serverKeyToggle)) current = current.filter(k=>k!==serverKeyToggle); else current.push(serverKeyToggle);
            await updatePingServersFilter(ping.id, current, guildId);
            // Determine page from description
            const desc = interaction.message.embeds[0]?.description ?? '';
            const match = desc.match(/Page (\d+)\/(\d+)/i);
            const page = match ? Math.max(0, parseInt(match[1])-1) : 0;
            const embed = buildServersEmbed(ping, nodeId, servers, current, page);
            const components = buildServerButtons(servers, current, ping, guildId, nodeId, page);
            try {
                await interaction.update({ embeds:[embed], components });
            } catch {
                await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral  });
            }
            if(ping.channel_id){
                await startPinger(interaction.client, ping.id, guildId);
                await triggerPingUpdate(interaction.client, ping.id, guildId);
            }
            return;
        }
    }
});
