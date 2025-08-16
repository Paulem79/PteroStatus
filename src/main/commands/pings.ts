// noinspection JSUnusedGlobalSymbols

import {Command} from "../handlers/commands.ts";
import {
    Colors,
    EmbedBuilder,
    InteractionContextType,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder
} from "../../deps.ts";
import {listPings} from "../sql/requests.ts";
import {MessageBuilder} from "../../api/builder.ts";
import {asDiscordLink} from "../../api/link.ts";
import {getNode, getServer} from "../../api/pterodactyl.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("pings")
        .setDescription("List server pings")
        .setDescriptionLocalizations({
            fr: "Lister les pings du serveur",
        })
        .addBooleanOption((option) =>
            option
                .setName("public")
                .setNameLocalizations({
                    fr: "publique",
                })
                .setDescription("Reply shown to everyone (otherwise ephemeral).")
                .setDescriptionLocalizations({
                    fr: "Réponse visible par tous (sinon éphémère).",
                })
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){
            await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral});
            return;
        }

        const isPublic = interaction.options?.getBoolean?.("public") === true;
        const flags = isPublic ? undefined : MessageFlags.Ephemeral;

        const embed = new EmbedBuilder()
            .setColor(Colors.Blue)
            .setTimestamp()
            .setTitle("Pings du serveur")

        const pings = await listPings(guildId);

        if(pings.length === 0){
            embed.setDescription("Aucun ping n'est configuré sur ce serveur.");
        } else {
            for (const ping of pings) {
                const pingBuilder = new MessageBuilder();
                pingBuilder
                    .line(`Créé le <t:${Math.floor(ping.created_at.getTime() / 1000)}:F>`)
                    .line(`Du panel ${ping.base_url}`)
                    .line(`Salon: <#${ping.channel_id}>`);

                if(ping.guild_id && ping.channel_id && ping.message_id) {
                    pingBuilder.line(`Message: ${asDiscordLink(ping.guild_id, ping.channel_id, ping.message_id)}`);
                }

                if(ping.nodes_filter && ping.nodes_filter.length > 0) {
                    const filter = JSON.parse(ping.nodes_filter) as string[];

                    const nodeNames = await Promise.all(
                        filter.map(async (nodeId) => {
                            const node = await getNode(ping.base_url, ping.app_key, parseInt(nodeId));
                            return node ? node.attributes.name : nodeId;
                        })
                    )

                    pingBuilder.line(`Node inclus: ${nodeNames.join(", ")}`)
                } else {
                    pingBuilder.line(`Node inclus: Tous`);
                }

                if(ping.servers_filter && ping.servers_filter.length > 0) {
                    const filter = JSON.parse(ping.servers_filter) as string[];

                    const serverNames = await Promise.all(
                        filter.map(async (serverId) => {
                            const server = await getServer(ping.base_url, ping.client_key, serverId);
                            return server ? server.attributes.name : serverId;
                        })
                    );

                    pingBuilder.line(`Serveurs inclus: ${serverNames.join(", ")}`)
                } else {
                    pingBuilder.line(`Serveurs inclus: Tous`);
                }

                embed.addFields({ name: ping.name, value: pingBuilder.build() });
            }
        }

        await interaction.reply({ embeds: [embed], flags: flags })
    }
});
