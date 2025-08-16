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
import {getPing, PingRow, updatePingNodesFilter} from "../sql/requests.ts";
import {getNodes} from "../../api/pterodactyl.ts";
import {startPinger, triggerPingUpdate} from "../pinger.ts";
import {NodeAttributes, Nodes} from "../../api/pterodactyl_types.ts";
import {listPingAutocomplete} from "../../api/db.ts";

// Cache nodes (guildId:pingName) 30s
const nodesCache = new Map<string, { at: number; nodes: NodeAttributes[] }>();
const PAGE_SIZE_NODES = 25;

function buildNodesEmbed(ping: PingRow, nodes: NodeAttributes[], included: number[], page: number) {
    const totalPages = Math.max(1, Math.ceil(nodes.length / PAGE_SIZE_NODES));
    const slice = nodes.slice(page * PAGE_SIZE_NODES, page * PAGE_SIZE_NODES + PAGE_SIZE_NODES);
    const embed = new EmbedBuilder()
        .setTitle(`Gestion des nodes • ${ping.name}`)
        .setDescription(`Cliquez pour ajouter/enlever un node du filtre. Page ${page+1}/${totalPages}`)
        .setTimestamp();
    for (const n of slice) {
        const inside = included.includes(n.id);
        embed.addFields({ name: `#${n.id} ${n.name}`, value: inside ? "✅ Inclus" : "❌ Exclu", inline: true });
    }
    if(slice.length === 0) embed.addFields({ name: "Aucun node", value: "Liste vide" });
    return embed;
}

function buildNodeButtons(nodes: NodeAttributes[], included: number[], ping: PingRow, guildId: string, page: number) {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    const totalPages = Math.max(1, Math.ceil(nodes.length / PAGE_SIZE_NODES));
    const slice = nodes.slice(page * PAGE_SIZE_NODES, page * PAGE_SIZE_NODES + PAGE_SIZE_NODES);
    let current: ButtonBuilder[] = [];
    for (const n of slice) {
        const inside = included.includes(n.id);
        const btn = new ButtonBuilder()
            .setCustomId(`pn|n|${guildId}|${ping.id}|${n.id}`)
            .setLabel(`#${n.id}`)
            .setStyle(inside ? ButtonStyle.Primary : ButtonStyle.Secondary);
        current.push(btn);
        if (current.length === 5) { rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...current)); current = []; }
    }
    if (current.length) rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...current));
    if (totalPages > 1) {
        const nav: ButtonBuilder[] = [];
        nav.push(new ButtonBuilder()
            .setCustomId(`pn|p|${guildId}|${ping.id}|${Math.max(0, page-1)}`)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page===0));
        nav.push(new ButtonBuilder()
            .setCustomId('pn|noop')
            .setLabel(`Page ${page+1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true));
        nav.push(new ButtonBuilder()
            .setCustomId(`pn|p|${guildId}|${ping.id}|${Math.min(totalPages-1, page+1)}`)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page===totalPages-1));
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...nav));
    }
    return rows.slice(0,5);
}

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("managenodes")
        .setNameLocalizations({
            fr: "gerernodes"
        })
        .setDescription("Show and manage nodes associated to the ping")
        .setDescriptionLocalizations({
            fr: "Afficher et gérer les nodes associés au ping"
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
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){ await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral}); return; }
        const id = interaction.options?.getNumber("id", true);
        const ping = await getPing(id, guildId);
        if(!ping){ await interaction.reply({content: "Ping introuvable.", flags: MessageFlags.Ephemeral}); return; }

        // get / cache nodes
        const cacheKey = `${guildId}:${id}`;
        const now = Date.now();
        let entry = nodesCache.get(cacheKey);
        if(!entry || (now - entry.at) > 30_000){
            const apiNodes = await getNodes(ping.base_url, ping.app_key) as Nodes | undefined;
            if(!apiNodes){ await interaction.reply({content:"Impossible de récupérer les nodes.", flags: MessageFlags.Ephemeral}); return; }
            entry = { at: now, nodes: apiNodes.data.map(d=>d.attributes) };
            nodesCache.set(cacheKey, entry);
        }
        const included = ping.nodes_filter ? JSON.parse(ping.nodes_filter) as number[] : [];
        const page = 0;
        const embed = buildNodesEmbed(ping, entry.nodes, included, page);
        const components = buildNodeButtons(entry.nodes, included, ping, guildId, page);
        await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral });
    },

    async autocomplete(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){
            await interaction.respond([]);
            return;
        }

        await listPingAutocomplete(interaction);
    },

    async button(interaction){
        const parts = interaction.customId.split('|');
        if(parts[0] !== 'pn') return;
        if(parts[1] === 'noop') { await interaction.deferUpdate(); return; }
        if(parts[1] === 'p') {
            const [, , guildId, idName, pageRaw] = parts;
            const id = Number(idName);
            if(interaction.guildId !== guildId){ await interaction.reply({content:"Contexte invalide.", flags: MessageFlags.Ephemeral }); return; }
            const ping = await getPing(id, guildId);
            if(!ping){ await interaction.reply({content:"Ping introuvable.", flags: MessageFlags.Ephemeral }); return; }
            const cacheKey = `${guildId}:${id}`;
            let entry = nodesCache.get(cacheKey);
            const now = Date.now();
            if(!entry || (now - entry.at) > 30_000){
                const apiNodes = await getNodes(ping.base_url, ping.app_key) as Nodes | undefined;
                if(apiNodes){ entry = { at: now, nodes: apiNodes.data.map(d=>d.attributes) }; nodesCache.set(cacheKey, entry); }
            }
            const included = ping.nodes_filter ? JSON.parse(ping.nodes_filter) as number[] : [];
            const page = Number(pageRaw);
            const embed = buildNodesEmbed(ping, entry?.nodes ?? [], included, page);
            const components = buildNodeButtons(entry?.nodes ?? [], included, ping, guildId, page);
            try { await interaction.update({ embeds:[embed], components }); } catch { await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral  }); }
            return;
        }
        if(parts[1] === 'n') {
            const [, , guildId, idName, nodeIdRaw] = parts;
            const id = Number(idName);
            if(interaction.guildId !== guildId){ await interaction.reply({ content: "Contexte invalide.", flags: MessageFlags.Ephemeral  }); return; }
            const ping = await getPing(id, guildId);
            if(!ping){ await interaction.reply({ content: "Ping introuvable.", flags: MessageFlags.Ephemeral  }); return; }
            const nodeId = Number(nodeIdRaw);
            let current = ping.nodes_filter ? JSON.parse(ping.nodes_filter) as number[] : [];
            if(current.includes(nodeId)) current = current.filter(n=>n!==nodeId); else current.push(nodeId);
            await updatePingNodesFilter(ping.id, current, guildId);
            const cacheKey = `${guildId}:${id}`;
            let entry = nodesCache.get(cacheKey);
            const now = Date.now();
            if(!entry || (now - entry.at) > 30_000){
                const apiNodes = await getNodes(ping.base_url, ping.app_key) as Nodes | undefined;
                if(apiNodes){
                    entry = { at: now, nodes: apiNodes.data.map(d=>d.attributes) };
                    nodesCache.set(cacheKey, entry);
                }
            }
            const nodes = entry?.nodes ?? [];
            // Récupérer page actuelle depuis le message embed (titre contient Page X/Y) ou fallback 0
            const footerField = interaction.message.embeds[0]?.description ?? '';
            const match = footerField.match(/Page (\d+)\/(\d+)/i);
            const currentPage = match ? Math.max(0, parseInt(match[1])-1) : 0;
            const embed = buildNodesEmbed(ping, nodes, current, currentPage);
            const components = buildNodeButtons(nodes, current, ping, guildId, currentPage);
            try {
                await interaction.update({ embeds:[embed], components });
            } catch {
                await interaction.reply({ embeds:[embed], components, flags: MessageFlags.Ephemeral });
            }

            if(ping.channel_id){
                await startPinger(interaction.client, ping.id, guildId);
                await triggerPingUpdate(interaction.client, ping.id, guildId);
            }
        }
    }
});
