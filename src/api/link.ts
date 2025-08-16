import {Message} from "../deps.ts";

export function toDiscordLink(message: Message<true>) {
    return asDiscordLink(message.guildId, message.channelId, message.id)
}

export function asDiscordLink(guildId: string, channelId: string, messageId: string) {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`;
}