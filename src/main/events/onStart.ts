import {ActivityType, Colors, EmbedBuilder, Events} from "../../deps.ts";

import {HandledEvent} from "../handlers/events.ts";
import {__dirname, setCommands} from "../main.ts";
import {getCommands} from "../handlers/commands.ts";
import {getNode, getNodes, getResources} from "../../api/pterodactyl.ts";

import ptero from "npm:pterodactyl-api-wrapper";
const api = ptero.default;

import config from "../../../config.json" with {type: "json"};
import {MessageBuilder} from "../../api/builder.ts";

export default {
    once: true,

    async listener(client) {
        setCommands(await getCommands(__dirname, "commands", client));

        client.user.setActivity(`${client.guilds.cache.size} serveur(s)`, {
            type: ActivityType.Listening,
        });

        api.Setup.setPanel(config.hostname);
        const app = new api.Application(config.appkey);

        console.log(`Prêt! Connecté en tant que ${client.user.tag}`);

        const channel = client.channels.cache.get("1405978566914605089");

        if (channel && channel.isTextBased() && channel.isSendable()) {
            const message = await channel.send({ content: "Ping..." });

            setInterval(async() => {
                const embedBuilder = new EmbedBuilder();

                const nodes = await getNodes(config.hostname, config.appkey);
                if(nodes && !nodes.errors) {
                    for (const rawNode of nodes.data) {
                        const node = await getNode(config.hostname, config.appkey, rawNode.attributes.id);

                        if(!node || node.errors) {
                            embedBuilder
                                .addFields({ name: `Node ${rawNode.attributes.name}`, value: `Hors-ligne ${rawNode.attributes}` });
                            continue;
                        }

                        const fieldMessage = new MessageBuilder();

                        const servers = await app.servers.list();
                        const nodeServers = servers.data.filter((server) => server.attributes.node === rawNode.attributes.id);

                        for (const nodeServer of nodeServers) {
                            const resources = await getResources(config.hostname, config.clientkey, nodeServer.attributes.uuid);

                            if(!resources || resources.errors) {
                                fieldMessage.line(`**${nodeServer.attributes.name}** Hors-ligne`);
                                continue;
                            }

                            fieldMessage.line(`**${nodeServer.attributes.name}** ${resources.attributes.current_state}`);
                        }

                        embedBuilder
                            .addFields({ name: `Node ${rawNode.attributes.name}`, value: fieldMessage.build()})
                    }
                } else {
                    embedBuilder
                        .addFields({ name: "Nodes", value: "Impossible de récupérer les nodes." });
                }

                embedBuilder
                    .setColor(Colors.Blurple)
                    .setTitle("Statut des Nodes")
                    .setDescription("Voici le statut des nodes Pterodactyl.")
                    .setTimestamp()

                message.edit({ content: "", embeds: [embedBuilder] });
            }, 4000)
        }
    },

    eventType: Events.ClientReady,
} as HandledEvent<Events.ClientReady>;
