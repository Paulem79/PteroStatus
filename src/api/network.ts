import { ChatInputCommandInteraction } from "../deps.ts";

export class PingSystem {
    private interaction: ChatInputCommandInteraction<"cached">

    public constructor(interaction: ChatInputCommandInteraction<"cached">) {
        this.interaction = interaction;
    }

    public api() {
        return Math.round(Math.max(0, this.interaction.client.ws.ping))
    }

    public host() {
        return Math.round(Date.now() - this.interaction.createdTimestamp)
    }

    public total() {
        return this.host() + this.api()
    }
}