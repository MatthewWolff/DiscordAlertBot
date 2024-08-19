import { ChatInputCommandInteraction, Client, Interaction } from "discord.js";
import { Command, PingCommand, ReplyCommand } from "../command";
import { BaseHandler } from "./baseHandler";

export class InteractionHandler extends BaseHandler {
    private commands: Command[];

    constructor(client: Client) {
        super(client)
        this.commands = [
            new PingCommand(),
            new ReplyCommand(),
        ];
    }

    getSlashCommands() {
        return this.commands.map((command: Command) =>
            command.slashCommandConfig.toJSON()
        );
    }

    private logInteraction(interaction: Interaction) {
        console.log({
            guild: { id: interaction.guildId, name: interaction.guild?.name },
            user: { name: interaction.user.globalName },
        })
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
                console.log(`Successfully executed command [/${interaction.commandName}]`);
            })
            .catch((err) => {
                    this.logInteraction(interaction);
                    console.log(`Error executing command [/${interaction.commandName}]: ${err}`);
                }
            );
    }
}
