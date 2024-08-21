import { ChatInputCommandInteraction, Client, Interaction } from "discord.js";

import { Command, PingCommand } from "../command";
import { BaseHandler } from "./baseHandler";
import { getLogger } from "../util";

const logger = getLogger("handler.interactionHandler");

export class InteractionHandler extends BaseHandler {
    private commands: Command[];

    constructor(client: Client) {
        super(client)
        this.commands = [
            new PingCommand(),
        ];
    }

    getSlashCommands() {
        return this.commands.map((command: Command) =>
            command.slashCommandConfig.toJSON()
        );
    }

    private logInteraction(interaction: Interaction) {
        logger.info("Interaction from " + JSON.stringify({
            user: { name: interaction.user.globalName },
            guild: { id: interaction.guildId, name: interaction.guild?.name },
        }));
    }

    public async handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
        const commandName = interaction.commandName;
        const matchedCommand = this.commands.find((command) => command.name === commandName);

        if (!matchedCommand) {
            return Promise.reject("Command not matched");
        }

        matchedCommand.execute(interaction)
            .then(() => {
                this.logInteraction(interaction)
                logger.info(`Successfully executed command [/${interaction.commandName}]`);
            })
            .catch((err) => {
                    this.logInteraction(interaction);
                    logger.error(`Error executing command [/${interaction.commandName}]: ${err}`);
                }
            );
    }
}
