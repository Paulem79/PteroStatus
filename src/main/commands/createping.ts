import {Command} from "../handlers/commands.ts";
import {MessageFlags, SlashCommandBuilder} from "../../deps.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setName("create")
        .setDescription("Créer un ping pour un panel")
        .addStringOption((option) =>
            option
                .setName("panel")
                .setDescription("Nom du panel")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("url")
                .setDescription("URL du panel")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("appkey")
                .setDescription("Clé d'application du panel")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("clientkey")
                .setDescription("Clé de client du panel")
                .setRequired(true)
        ),

    async execute(interaction) {
        const panel = interaction.options?.getString("panel");
        const url = interaction.options?.getString("url");
        const appkey = interaction.options?.getString("appkey");
        const clientkey = interaction.options?.getString("clientkey");

        if(panel == undefined || url == undefined || appkey == undefined || clientkey == undefined) {
            await interaction.reply({ content: "Veuillez fournir tous les paramètres requis.", flags: MessageFlags.Ephemeral });
            return;
        }


    },
});
