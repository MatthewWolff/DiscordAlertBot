import { Client, Message, User } from "discord.js";

import { BaseHandler } from "./baseHandler";
import { BOT_OWNER, DIRECT_MESSAGE } from "../config/constants";
import { discordToString, getLogger } from "../util";

const logger = getLogger("handler.MessageHandler");

export class MessageHandler extends BaseHandler {

    DM_AUTHOR_ID_TEXT_SEPARATOR = " || ";

    constructor(client: Client) {
        super(client);
        if (BOT_OWNER === '') {
            logger.error("BOT_OWNER not set in environment file, cannot use messageHandler");
        }
    }

    private async forwardMessage(message: Message, to: User, from: User) {
        const ownerMessageSuffix = from.id !== BOT_OWNER ? `- ${from.username} ${this.DM_AUTHOR_ID_TEXT_SEPARATOR} ${from.id}` : '';
        this.client.user.send(message.content + ownerMessageSuffix)
            .then(() => logger.info(`Forwarded message to ${to.username} from ${from.username} - """${message}"""`));
    }

    async handleMessage(message: Message) {
        logger.debug(`Handling message:\n${discordToString(message)}`);
        const owner = await this.getUser(BOT_OWNER);

        // @ts-ignore
        if (message.channel.type === DIRECT_MESSAGE) {
            if (message.author.id === BOT_OWNER) {
                logger.debug("Message sender is owner");
                // check if the message is a reply
                if (message.reference?.messageId) {
                    const repliedMessage: Message = await message.author.dmChannel.messages.fetch(message.reference.messageId);
                    logger.info(`Replied message: ${JSON.stringify(repliedMessage, null, 2)}`);
                    // if replying to a user's message, locate that message and determine the user
                    if (repliedMessage.content.includes(this.DM_AUTHOR_ID_TEXT_SEPARATOR)) {
                        // extract all text after the DM_AUTHOR_ID_TEXT_SEPARATOR and retrieve that as a user
                        const messageParts = repliedMessage.content.split(this.DM_AUTHOR_ID_TEXT_SEPARATOR);
                        const userId = messageParts[messageParts.length - 1].trim();
                        const user = await this.getUser(userId);
                        await this.forwardMessage(message, user, owner);
                    }
                }
            } else {
                await this.forwardMessage(message, owner, message.author);
            }
        }
    }
}
