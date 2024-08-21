import { Message, User } from "discord.js";

interface MessageCoreParams {
    author: User;
    messageId: string;
    timestamp: number;
    channelId: string
    isDirectMessage: boolean;
    content: string;
    inReplyTo?: string;
}

export class MessageCore {
    author: User;
    messageId: string;
    timestamp: number;
    channelId: string
    isDirectMessage: boolean;
    content: string;
    inReplyTo?: string;

    constructor({ author, messageId, timestamp, channelId, isDirectMessage, content, inReplyTo }: MessageCoreParams) {
        this.author = author;
        this.messageId = messageId;
        this.timestamp = timestamp;
        this.channelId = channelId;
        this.isDirectMessage = isDirectMessage;
        this.content = content;
        this.inReplyTo = inReplyTo
    }

    public getReplyMessage(): Promise<Message> {
        if (!this.inReplyTo) return undefined;
        return this.author.dmChannel.messages.fetch(this.inReplyTo);
    }

    public toJSON(): object {
        return {
            text: this.content,
            isDirectMessage: this.isDirectMessage,
            inReplyTo: this.inReplyTo,
            author: {
                username: this.author.username,
                globalName: this.author.globalName,
                bot: this.author.bot,
                id: this.author.id,
            },
            messageId: this.messageId,
            timestamp: this.timestamp,
            channelId: this.channelId,
        }
    }

    public toString(): string {
        return "Message " + JSON.stringify(this.toJSON(), null, 2);
    }
}
