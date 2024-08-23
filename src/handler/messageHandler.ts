import { Client, Message, User } from "discord.js";

import { BaseHandler } from "./baseHandler";
import { BOT_OWNER } from "../config/constants";
import { extractMessage, getLogger } from "../util";
import { MessageCore } from "../model";

const logger = getLogger("handler.MessageHandler");

export class MessageHandler extends BaseHandler {

    constructor(client: Client) {
        super(client);
        if (BOT_OWNER === '') {
            logger.error("BOT_OWNER not set in environment file, cannot use messageHandler");
        }
    }

    async handle(message: Message): Promise<void> {
        if (message.author.id == this.client.user.id) return; // don't self-reply

        const msg = extractMessage(message);
        logger.debug(`Received message:\n${msg}`);
        if (msg.author.bot) {
            logger.info(`Received bot message: ${msg.content} - ${msg.author.username} (id#${msg.author.id})`);
            msg.author.send("I don't talk to robots. Good day")
                .then(() => logger.fatal("Initiated sassy mode"))
                .catch(e => logger.error(`Error sending message: ${e}`));
        }

        const owner = await this.getUser(BOT_OWNER);
        if (msg.isDirectMessage) {
            if (msg.author.id !== BOT_OWNER) {
                await this.sendMessage(message, message.author, owner);
            } else {
                if (msg.inReplyTo) {
                    await this.handleReply(message, owner);
                } else {
                    logger.info(`Received non-reply message from bot owner - "${msg.content}"`);
                }
            }
        }
    }

    /**
     * When bot owner replies to a bot message, forward it to the author of the original message
     * @param message the message to handle the reply for
     * @param owner the owner of the bot
     */
    private async handleReply(message: Message, owner: User): Promise<void> {
        const repliedMessage = await extractMessage(message).getReplyMessage();
        logger.debug(`Retrieved reply: ${repliedMessage}`);
        if (repliedMessage.content.includes(this.DM_AUTHOR_ID_TEXT_SEPARATOR)) {
            this.getReplyAuthor(repliedMessage)
                .then(user => this.sendMessage(message, owner, user))
                .catch(e => logger.error("Unable to parse <@User> from reply", e));
        }
    }

    /**
     * extract all text after the DM_AUTHOR_ID_TEXT_SEPARATOR and retrieve that as a user
     * @param message the message to extract the author from
     * @private a promise containing the User
     */
    private getReplyAuthor(message: MessageCore | Message): Promise<User> {
        logger.debug(`Extracting author from "${message.content}"`);
        const messageParts = message.content.split(this.DM_AUTHOR_ID_TEXT_SEPARATOR);
        const userId = messageParts[messageParts.length - 1].trim();
        return this.getUser(userId);
    }
}
