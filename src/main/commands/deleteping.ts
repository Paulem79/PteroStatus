import {Command} from "../handlers/commands.ts";
import {InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder} from "../../deps.ts";
import {deletePing, getPing, listPings} from "../sql/requests.ts";
import {stopPinger} from "../pinger.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("deleteping")
        .setDescription("Supprimer un ping")
        .addStringOption(option=>
            option
                .setName("name")
                .setNameLocalizations({
                    fr: "nom"
                })
                .setDescription("Ping's name")
                .setDescriptionLocalizations({
                    fr: "Nom du ping"
                })
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){ await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral}); return; }
        const name = interaction.options.getString("name", true).toLowerCase();

        const ping = await getPing(name, guildId);
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

        const success = await deletePing(name, guildId);
        stopPinger(name, guildId);

        if(!success) {
            await interaction.reply({ content:"Ce ping n'existe pas.", flags: MessageFlags.Ephemeral });
            return;
        }

        await interaction.reply({ content:`Ping '${name}' supprimé.`, flags: MessageFlags.Ephemeral });
    },

    async autocomplete(interaction) {
        const guildId = interaction.guildId; if(!guildId){ await interaction.respond([]); return; }
        const focused = interaction.options.getFocused(true);
        if(focused.name !== 'name') return;
        const value = focused.value.toLowerCase();
        const pings = await listPings(guildId);
        await interaction.respond(pings
            .filter(p=>p.name.toLowerCase().includes(value))
            .slice(0,25)
            .map(p=>({name:p.name, value:p.name}))
        );
    }
});
