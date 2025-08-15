import { ChatInputCommandInteraction } from "../deps.ts";

export class PingSystem {
    private interaction: ChatInputCommandInteraction<"cached">

    public constructor(interaction: ChatInputCommandInteraction<"cached">) {
        this.interaction = interaction;
    }

    private apiInternal() {
        return this.interaction.client.ws.ping
    }

    public api() {
        return Math.round(this.apiInternal())
    }

    public host() {
        return this.total() - this.apiInternal()
    }

    public total() {
        return Date.now() - this.interaction.createdTimestamp
    }
}