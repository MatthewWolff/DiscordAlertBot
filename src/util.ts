import { Logger } from "typescript-logging-log4ts-style";
import { inspect } from "node:util";

import { provider } from "./config/logConfig";
import { Message } from "discord.js";
import { MessageCore } from "./model";
import { DIRECT_MESSAGE_CHANNEL_TYPE } from "./config/constants";

export function getLogger(name: string): Logger {
    return provider.getLogger(name);
}

export function discordToString(obj: object): string {
    return inspect(obj);
}

export function extractMessage(message: Message): MessageCore {
    return new MessageCore({
        author: message.author,
        content: message.content,
        timestamp: message.createdTimestamp,
        messageId: message.id,
        channelId: message.channelId,
        isDirectMessage: message.channel.type === DIRECT_MESSAGE_CHANNEL_TYPE,
        inReplyTo: message.reference?.messageId ?? undefined,
    });
}
