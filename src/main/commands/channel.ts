import {Command} from "../handlers/commands.ts";
import {
    ChannelType,
    InteractionContextType,
    MessageFlags,
    PermissionsBitField,
    SlashCommandBuilder
} from "../../deps.ts";
import {getPing, listPings, setPingChannel} from "../sql/requests.ts";
import {MessageBuilder} from "../../api/builder.ts";
import {startPinger} from "../pinger.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("channel")
        .setDescription("Associer un salon Discord à un ping")
        .addStringOption(o=>o.setName("nom").setDescription("Nom du ping").setRequired(true).setAutocomplete(true))
        .addChannelOption(o=>o.setName("salon").setDescription("Salon Discord").addChannelTypes(ChannelType.GuildText).setRequired(true)),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId){ await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral}); return; }
        const name = interaction.options?.getString("nom", true)?.toLowerCase() ?? "";
        const channel = interaction.options?.getChannel("salon", true)!;

        const ping = await getPing(name, guildId);
        if(!ping){
            await interaction.reply({content: "Ping introuvable.", flags: MessageFlags.Ephemeral});
            return;
        }

        const ok = await setPingChannel(name, channel.id, guildId);
        if(!ok){
            await interaction.reply({content: "Impossible de mettre à jour le salon.", flags: MessageFlags.Ephemeral});
            return;
        }

        const mb = new MessageBuilder()
            .line(`🔗 Salon associé pour **${name}** → <#${channel.id}>`);
        await mb.reply(interaction, MessageFlags.Ephemeral);
        await startPinger(interaction.client, name);
    },

    async autocomplete(interaction) {
        const guildId = interaction.guildId;
        if(!guildId) { await interaction.respond([]); return; }
        const focused = interaction.options.getFocused(true);
        if (focused.name !== 'nom') return;
        const value = focused.value.toLowerCase();
        const pings = await listPings(guildId);
        const filtered = pings
            .filter(p=> p.name.toLowerCase().includes(value))
            .slice(0, 25)
            .map(p=>({ name: p.name, value: p.name }));
        await interaction.respond(filtered);
    }
});
