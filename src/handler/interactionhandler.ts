import { ChatInputCommandInteraction, Client, Interaction } from "discord.js";

import { Command, PingCommand, SleepCommand } from "../command";
import { BaseHandler } from "./baseHandler";
import { getLogger } from "../util";
import { BOT_OWNER, SLEEP_DURATION_HOURS, SLEEPING_PREFIX } from "../config/constants";

const logger = getLogger("handler.interactionHandler");

export class InteractionHandler extends BaseHandler {
    private commands: Command[];

    constructor(client: Client) {
        super(client)
        this.commands = [
            new PingCommand(),
            new SleepCommand(),
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

    public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
        const commandName = interaction.commandName;
        const matchedCommand = this.commands.find((command) => command.name === commandName);

        if (!matchedCommand) {
            return Promise.reject("Command not matched");
        }

        if (matchedCommand.name == "sleep") {
            if (interaction.user.id == BOT_OWNER) {
                const newTime = new Date();
                newTime.setHours(newTime.getHours() + SLEEP_DURATION_HOURS);
                await this.sendSelfMessage(`${SLEEPING_PREFIX} ${newTime}`)
            } else {
                await interaction.reply({ content: "Hush kitten, you are not the bot owner", ephemeral: true });
            }
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
