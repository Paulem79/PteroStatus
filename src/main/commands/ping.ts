import { Command } from "../handlers/commands.ts";
import { InteractionContextType, MessageFlags, PermissionsBitField, SlashCommandBuilder, ChannelType, AutocompleteInteraction, ButtonInteraction } from "../../deps.ts";
import { subCreate } from "../ping/create.ts";
import { subDelete } from "../ping/delete.ts";
import { subEdit } from "../ping/edit.ts";
import { subChannel } from "../ping/channel.ts";
import { subNodes, handleNodeButton } from "../ping/nodes.ts";
import { subServers, handleServerButton, autocompleteServers } from "../ping/servers.ts";
import { subList } from "../ping/list.ts";
import { listPingAutocomplete } from "../../api/listPingAutocomplete.ts";

export default new Command({
    data: new SlashCommandBuilder()
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .setName("ping")
        .setDescription("Gestion des pings Pterodactyl")
        // create
        .addSubcommand(sc => sc
            .setName("create")
            .setNameLocalizations({
                fr: "creer",
            })
            .setDescription("Create a ping for a Pterodactyl/Pelican panel.")
            .setDescriptionLocalizations({
                fr: "Créer un ping pour un panel Pterodactyl/Pelican.",
            })
            .addStringOption((option) => option
                .setName("name")
                .setNameLocalizations({
                    fr: "nom",
                })
                .setDescription("Unique name of the ping")
                .setDescriptionLocalizations({
                    fr: "Nom unique du ping",
                })
                .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("baseurl")
                    .setNameLocalizations({
                        fr: "url",
                    })
                    .setDescription("Base URL of the panel (eg: https://panel.example.com)")
                    .setDescriptionLocalizations({
                        fr: "URL de base du panel (ex: https://panel.exemple.com)",
                    })
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("appkey")
                    .setNameLocalizations({
                        fr: "cleapplication",
                    })
                    .setDescription("Api Key (Admin / API Keys)")
                    .setDescriptionLocalizations({
                        fr: "Clé d'Application (Admin / API Keys)",
                    })
                    .setRequired(true)
            )
            .addStringOption((option) =>
                option
                    .setName("clientkey")
                    .setNameLocalizations({
                        fr: "cleclient",
                    })
                    .setDescription("Client Key (Profile / API Keys)")
                    .setDescriptionLocalizations({
                        fr: "Clé Client (Profile / API Keys)",
                    })
                    .setRequired(true)
            )
        )
        // channel
        .addSubcommand(sc => sc
            .setName("channel")
            .setNameLocalizations({
                fr: "salon",
            })
            .setDescription("Associate a discord channel where the ping status will be sent.",)
            .setDescriptionLocalizations({
                fr: "Associer un salon Discord où le statut du ping sera envoyé.",
            })
            .addNumberOption((option) =>
                option
                    .setName("id")
                    .setNameLocalizations({
                        fr: "identifiant",
                    })
                    .setDescription("Ping's id")
                    .setDescriptionLocalizations({
                        fr: "Identifiant du ping",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addChannelOption((option) =>
                option
                    .setName("channel")
                    .setNameLocalizations({
                        fr: "salon",
                    })
                    .setDescription("Discord channel to associate with the ping")
                    .setDescriptionLocalizations({
                        fr: "Salon Discord à associer au ping",
                    })
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
            )
        )
        // edit
        .addSubcommand(sc => sc
            .setName("edit")
            .setNameLocalizations({
                fr: "modifier",
            })
            .setDescription("Edit the keys, the channel, or the name of a ping.")
            .setDescriptionLocalizations({
                fr: "Modifier les clés, le salon, ou le nom d'un ping",
            })
            .addNumberOption((option) =>
                option
                    .setName("id")
                    .setNameLocalizations({
                        fr: "identifiant",
                    })
                    .setDescription("Ping's id")
                    .setDescriptionLocalizations({
                        fr: "Identifiant du ping",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addStringOption((option) =>
                option
                    .setName("newname")
                    .setNameLocalizations({
                        fr: "nouveaunom",
                    })
                    .setDescription("Ping's new name")
                    .setDescriptionLocalizations({
                        fr: "Nouveau nom du ping",
                    })
                    .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName("appkey")
                    .setDescription("The new app key (Admin / API Keys)")
                    .setDescriptionLocalizations({
                        fr: "La nouvelle clé d'application (Admin / API Keys)",
                    })
                    .setRequired(false)
            )
            .addStringOption((option) =>
                option
                    .setName("clientkey")
                    .setNameLocalizations({
                        fr: "cleclient",
                    })
                    .setDescription("The new client key (Profile / API Keys)")
                    .setDescriptionLocalizations({
                        fr: "La nouvelle clé client (Profile / API Keys)",
                    })
                    .setRequired(false)
            )
            .addChannelOption((option) =>
                option
                    .setName("channel")
                    .setNameLocalizations({
                        fr: "salon",
                    })
                    .setDescription("The new channel to associate with the ping")
                    .setDescriptionLocalizations({
                        fr: "Le nouveau salon à associer au ping",
                    })
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(false)
            )
        )
        // delete
        .addSubcommand(sc => sc
            .setName("delete")
            .setNameLocalizations({
                fr: "supprimer",
            })
            .setDescription("Delete a ping.")
            .setDescriptionLocalizations({
                fr: "Supprimer un ping",
            })
            .addNumberOption((option) =>
                option
                    .setName("id")
                    .setNameLocalizations({
                        fr: "identifiant",
                    })
                    .setDescription("Ping's id")
                    .setDescriptionLocalizations({
                        fr: "Identifiant du ping",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        )
        // nodes
        .addSubcommand(sc => sc
            .setName("nodes")
            .setDescription("Manage the nodes of a ping")
            .setDescriptionLocalizations({
                fr: "Gérer les nodes d'un ping",
            })
            .addNumberOption((option) =>
                option
                    .setName("id")
                    .setNameLocalizations({
                        fr: "identifiant",
                    })
                    .setDescription("Ping's id")
                    .setDescriptionLocalizations({
                        fr: "Identifiant du ping",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        )
        // servers
        .addSubcommand(sc => sc
            .setName("servers")
            .setNameLocalizations({
                fr: "serveurs",
            })
            .setDescription("Manage the servers of a ping's node")
            .setDescriptionLocalizations({
                fr: "Gérer les serveurs d'un node du ping",
            })
            .addNumberOption((option) =>
                option
                    .setName("id")
                    .setNameLocalizations({
                        fr: "identifiant",
                    })
                    .setDescription("Ping's id")
                    .setDescriptionLocalizations({
                        fr: "Identifiant du ping",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
            .addIntegerOption((option) =>
                option
                    .setName("nodeid")
                    .setNameLocalizations({
                        fr: "idnode",
                    })
                    .setDescription("Node's ID")
                    .setDescriptionLocalizations({
                        fr: "ID du node",
                    })
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        )
        // list
        .addSubcommand(sc => sc
            .setName("list")
            .setNameLocalizations({
                fr: "liste",
            })
            .setDescription("List all pings.")
            .setDescriptionLocalizations({
                fr: "Lister tous les pings.",
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
            )
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        switch (sub) {
            case "create": return subCreate(interaction);
            case "delete": return subDelete(interaction);
            case "edit": return subEdit(interaction);
            case "channel": return subChannel(interaction);
            case "nodes": return subNodes(interaction);
            case "servers": return subServers(interaction);
            case "list": return subList(interaction);
            default:
                await interaction.reply({ content: "Sous-commande inconnue.", flags: MessageFlags.Ephemeral });
        }
    },

    async autocomplete(interaction: AutocompleteInteraction<"cached">) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === "id") {
            await listPingAutocomplete(interaction);
            return;
        }
        if (focused.name === "nodeid") {
            await autocompleteServers(interaction);
            return;
        }
        await interaction.respond([]);
    },

    async button(interaction: ButtonInteraction<"cached">) {
        await handleNodeButton(interaction);
        await handleServerButton(interaction);
    }
});

