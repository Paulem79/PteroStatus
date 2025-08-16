// noinspection JSUnusedGlobalSymbols

import {Command} from "../handlers/commands.ts";
import {InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder} from "../../deps.ts";
import {deletePing, getPing} from "../sql/requests.ts";
import {stopPinger} from "../pinger.ts";
import {listPingAutocomplete} from "../../api/db.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("deleteping")
        .setDescription("Supprimer un ping")
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
        const id = interaction.options.getNumber("id", true);

        const ping = await getPing(id, guildId);
        if(!ping){
            await interaction.reply({content:"Ping introuvable.", flags: MessageFlags.Ephemeral});
            return;
        }

        // Tenter de supprimer le message de statut si présent
        if(ping.channel_id && ping.message_id){
            const channel = interaction.client.channels.cache.get(ping.channel_id);
            if(channel && channel.isTextBased()) {
                try {
                    const msg = await channel.messages.fetch(ping.message_id);
                    await msg.delete().catch(()=>{});
                } catch {
                    // ignore
                }
            }
        }

        const success = await deletePing(ping.id, guildId);
        stopPinger(ping.id, guildId);

        if(!success) {
            await interaction.reply({ content:"Ce ping n'existe pas.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.reply({ content:`Ping '${ping.name}' supprimé.`, flags: MessageFlags.Ephemeral });
    },

    async autocomplete(interaction) {
        const guildId = interaction.guildId; if(!guildId){ await interaction.respond([]); return; }

        await listPingAutocomplete(interaction);
    }
});
