import {Command} from "../handlers/commands.ts";
import {InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder} from "../../deps.ts";
import {createPing, getPing} from "../sql/requests.ts";
import {getNodes} from "../../api/pterodactyl.ts";
import {MessageBuilder} from "../../api/builder.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("createping")
        .setDescription("Créer un ping pour un panel Pterodactyl")
        .addStringOption((option) =>
            option
                .setName("nom")
                .setDescription("Nom unique du ping")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("baseurl")
                .setDescription("URL de base du panel (ex: https://panel.exemple.com)")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("appkey")
                .setDescription("Clé Application (Admin / Application API)")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("clientkey")
                .setDescription("Clé Client (Utilisateur)")
                .setRequired(true)
        ),

    async execute(interaction) {
        const guildId = interaction.guildId;
        if(!guildId) { await interaction.reply({content:"Commande à utiliser dans un serveur.", flags: MessageFlags.Ephemeral}); return; }
        const name = interaction.options?.getString("nom", true)?.trim().toLowerCase() as string;
        let baseurl = interaction.options?.getString("baseurl", true).trim();
        const appkey = interaction.options?.getString("appkey", true).trim();
        const clientkey = interaction.options?.getString("clientkey", true).trim();

        if (!/^https?:\/\//i.test(baseurl)) baseurl = `https://${baseurl}`; // forcer schéma
        if (baseurl.endsWith('/')) baseurl = baseurl.slice(0, -1);

        if (name.length > 64) {
            await interaction.reply({content: "Nom trop long (64 max).", flags: MessageFlags.Ephemeral});
            return;
        }

        // Collision locale
        if (await getPing(name, guildId)) {
            await interaction.reply({content: "Un ping avec ce nom existe déjà sur cette guilde.", flags: MessageFlags.Ephemeral});
            return;
        }

        // Test API (nodes) pour valider appkey
        const nodes = await getNodes(baseurl, appkey);
        if (!nodes) {
            await interaction.reply({content: "Impossible d'accéder à l'API (vérifiez l'URL / appkey).", flags: MessageFlags.Ephemeral});
            return;
        }

        const ok = await createPing(name, baseurl, appkey, clientkey, guildId);
        if (!ok) {
            await interaction.reply({content: "Échec création (doublon?).", flags: MessageFlags.Ephemeral});
            return;
        }

        const mb = new MessageBuilder()
            .line(`✅ Ping créé: **${name}**`)
            .line(`URL: ${baseurl}`)
            .line(`Nodes détectés: ${nodes.meta?.pagination?.total ?? nodes.data?.length ?? 0}`)
            .line(`Associez un salon avec /channel`);

        await mb.reply(interaction, MessageFlags.Ephemeral);
    },
});
